package manager

import (
	"errors"
	"fmt"
	log "github.com/Sirupsen/logrus"
	r "github.com/dancannon/gorethink"
	c "github.com/shipyard/shipyard/checker"
	apiClient "github.com/shipyard/shipyard/client"
	"github.com/shipyard/shipyard/model"
	"time"
)

type executeBuildTasksResults struct {
	projectResult *model.Result
	appliedTag string
	buildStatus string
	buildResult *model.BuildResult
}

//methods related to the Build structure
func (m DefaultManager) GetBuilds(projectId string, testId string) ([]*model.Build, error) {
	res, err := r.Table(tblNameBuilds).Filter(map[string]string{"projectId": projectId, "testId": testId}).Run(m.session)
	defer res.Close()
	if err != nil {
		return nil, err
	}
	builds := []*model.Build{}
	if err := res.All(&builds); err != nil {
		return nil, err
	}
	return builds, nil
}

func (m DefaultManager) GetBuild(projectId string, testId string, buildId string) (*model.Build, error) {
	return m.GetBuildById(buildId)
}

func (m DefaultManager) GetBuildById(buildId string) (*model.Build, error) {
	log.Info("looking for build in db")
	res, err := r.Table(tblNameBuilds).Filter(map[string]string{"id": buildId}).Run(m.session)
	log.Info("done looking in db")
	defer res.Close()
	if err != nil {
		return nil, err
	}
	if res.IsNil() {
		return nil, ErrBuildDoesNotExist
	}
	var build *model.Build
	if err := res.One(&build); err != nil {
		return nil, err
	}
	log.Info("return build")
	return build, nil
}

func (m DefaultManager) GetBuildStatus(projectId string, testId string, buildId string) (string, error) {
	build, err := m.GetBuildById(buildId)

	if err != nil {
		log.Errorf("Could not get build status for build= %s err= %s", buildId, err.Error())
		return "", err
	}

	if build.Status == nil {
		errMsg := fmt.Sprintf("Could not get build status for build= %s, status is nil", buildId, err.Error())
		log.Errorf(errMsg)
		return "", errors.New(errMsg)
	}
	return build.Status.Status, nil
}
func (m DefaultManager) GetBuildResults(projectId string, testId string, buildId string) ([]*model.BuildResult, error) {
	build, err := m.GetBuildById(buildId)

	if err != nil {
		log.Errorf("Could not get results for build= %s err= %", buildId, err.Error())
		return nil, err
	}

	return build.Results, nil
}
func (m DefaultManager) CreateBuild(projectId string, testId string, buildAction *model.BuildAction) (string, error) {

	var eventType string
	eventType = eventType
	var build *model.Build

	// In order to create a build we should get a start action
	if buildAction.Action != model.BuildStartActionLabel {
		log.Errorf("Build action should be %s, but received %s, error = %s",
			model.BuildStartActionLabel,
			buildAction.Action,
			ErrBuildActionNotSupported.Error(),
		)
		return "", ErrBuildActionNotSupported
	}

	// Instantiate a new Build object and fill out some fields
	build = &model.Build{}
	build.TestId = testId
	build.ProjectId = projectId
	build.StartTime = time.Now()

	// we change the build's buildStatus to submitted
	build.Status = &model.BuildStatus{Status: model.BuildStatusNewLabel}

	// Get the project related to the Test / Build
	project, err := m.Project(projectId)
	if err != nil && err != ErrProjectDoesNotExist {
		return "", err
	}

	// Get the Test and its TargetArtifacts
	test, err := m.GetTest(projectId, testId)
	if err != nil && err != ErrTestDoesNotExist {
		return "", err
	}
	targetArtifacts := test.Targets

	// we get the ids for the targets we want to test
	targetIds := []string{}
	for _, target := range targetArtifacts {
		targetIds = append(targetIds, target.ID)

	}
	// Retrieve the images from the projectId
	// TODO: Investigate if we can query db for the images matching the Ids in the TargetArtifacts
	projectImages, err := m.GetImages(projectId)
	if err != nil && err != ErrProjectImagesProblem {
		return "", err
	}

	// Collect the images that are TargetArtifacts
	// by comparing the ImageID with the ArtifactId
	imagesToBuild := []*model.Image{}
	for _, image := range projectImages {
		for _, artifactId := range targetIds {
			if image.ID == artifactId {
				imagesToBuild = append(imagesToBuild, image)
			}
		}
	}

	// Store the Build in the table in rethink db
	response, err := r.Table(tblNameBuilds).Insert(build).RunWrite(m.session)
	if err != nil {
		return "", err
	}

	build.ID = func() string {
		if len(response.GeneratedKeys) > 0 {
			return string(response.GeneratedKeys[0])
		}
		return ""
	}()

	log.Printf("Processing %d image(s)", len(imagesToBuild))

	// Run build for each image (each image represents a build task)
	go m.executeBuildTasks(project, test, build, imagesToBuild)

	// TODO: all these event types should be refactored as constants
	eventType = "add-build"
	m.logEvent(eventType, fmt.Sprintf("id=%s", build.ID), []string{"security"})
	return build.ID, nil
}

func (m DefaultManager) executeBuildTasks(
	project *model.Project,
	test *model.Test,
	build *model.Build,
	imagesToBuild []*model.Image,
) {

	// Channels for `executeBuildTask` generators
	var taskReceivingChannels []<-chan executeBuildTasksResults
	// For each image that we target in the test, try to run a build / verification
	// TODO: Add "running", "start", etc... as constants somewhere
	m.UpdateBuildStatus(build.ID, "running")
	for _, image := range imagesToBuild {
		// Start executing tasks concurrently
		channel, err := m.executeBuildTask(*project, *test, *build, *image)
		if err != nil {
			log.Error(err)
			return
		}
		taskReceivingChannels = append(taskReceivingChannels, channel)
	}
	// Synchronize with goroutines and fetch the build results
	var buildStatuses []string
	var buildResults []*model.BuildResult
	for i, taskReceivingChannel := range taskReceivingChannels {
		results := <-taskReceivingChannel
		// Fetch the build statuses and store them for later use
		buildStatuses = append(buildStatuses, results.buildStatus)
		// Fetch the build results and store them for later use
		buildResults = append(buildResults, results.buildResult)
		// Update results for the project
		m.CreateOrUpdateResults(project.ID, results.projectResult)
		// Update ILM tags
		m.UpdateImageIlmTags(project.ID, imagesToBuild[i].ID, results.appliedTag)
	}
	// Check to see if build was successful by comparing the statuses for all build tasks
	buildStatus := "finished_success"
	for _, status := range buildStatuses {
		if status != "finished_success" {
			buildStatus = "finished_failed"
			break
		}
	}

	// Update build results in our build
	if err := m.UpdateBuildResults(build.ID, buildResults); err != nil {
		log.Error(err)
	}
	// Update status for our build
	if err := m.UpdateBuildStatus(build.ID, buildStatus); err != nil {
		log.Error(err)
	}
}

// Generator that executes a BuilTask in the background as part of a wait group.
// TODO: We should probably remove the `name` param as we already have the corresponding image object
// TODO: Remove all *updates* from this method as they may cause the go routines to share address space
func (m DefaultManager) executeBuildTask(
	project model.Project,
	test model.Test,
	build model.Build,
	image model.Image,
) (<-chan executeBuildTasksResults, error) {
	channel := make(chan executeBuildTasksResults)

	go func() {

		// Check to see if the image exists locally, if not, try to pull it.
		if !m.VerifyIfImageExistsLocally(image) {
			log.Printf("Image %s not available locally, will try to pull...", image.PullableName())
			if err := m.PullImage(image); err != nil {
				log.Errorf("Error pulling image %s", image.PullableName())
				return
			}
		}

		// Fetch docker ID of image
		dockerImageId, err := m.FetchIDForImage(image.PullableName())
		image.ImageId = dockerImageId
		if err != nil {
			log.Error(err)
			return
		}

		log.Printf("Will attempt to test image %s with Clair...", image.PullableName())

		// Once the image is available, try to test it with Clair
		resultsSlice, isSafe, err1 := c.CheckImage(&image)
		if err1 != nil {
			log.Error(err1)
			return
		}

		// Create build result with clair results
		buildResult := model.NewBuildResult(
			build.ID,
			model.NewTargetArtifact(
				image.ID,
				model.TargetArtifactImageType,
				image,
			),
			resultsSlice)
		buildResult.TimeStamp = time.Now()

		// determine success or failure (values will be added to channel)
		var finishLabel string
		var appliedTag string
		if isSafe {
			// if we don't get an error and we get the isSafe flag == true
			// we mark the test for the image as successful
			finishLabel = "finished_success"
			// if the test is successful, we update the images' ilm tags with the test tags we defined in the case of a success
			appliedTag = test.Tagging.OnSuccess
			log.Infof("Image %s is safe! :)", image.PullableName())
		} else {
			// if the test is failed, we update the images' ilm tags with the test tags we defined in the case of a failure
			appliedTag = test.Tagging.OnFailure
			finishLabel = "finished_failure"
			log.Errorf("Image %s is NOT safe :(", image.PullableName())
		}

		// Instantiate `testResult` with the information we have
		testResult := &model.TestResult{
			TestId: test.ID,
			DockerImageId: dockerImageId,
			BuildId: build.ID,
			TestName: test.Name,
			ImageName: image.PullableName(),
			SimpleResult: model.SimpleResult{
				Date: time.Now(),
				Status: finishLabel,
				EndDate: time.Now(),
				AppliedTag: []string{
					appliedTag,
				},
			},
			Blocker: false,
		}

		// TODO: need to revisit API spec, there are just too many redundant "Result" types stored,
		// TODO: these should probably just be views of the BuildResults
		// TODO: need to set the author to the real user
		// TODO: use model.NewResult() instead
		projectResult := &model.Result{
			BuildId:     build.ID,
			Author:      "author",
			ProjectId:   project.ID,
			Description: project.Description,
			Updater:     "author",
			CreateDate:  time.Now(),
			TestResults: []*model.TestResult{
				testResult,
			},
			LastUpdate: time.Now(),
			LastTagApplied: appliedTag,
		}

		channel <- executeBuildTasksResults{
			projectResult: projectResult,
			appliedTag: appliedTag,
			buildStatus: finishLabel,
			buildResult: buildResult,
		}
	}()

	return channel, nil
}

func (m DefaultManager) UpdateBuild(projectId string, testId string, buildId string, buildAction *model.BuildAction) error {
	var eventType string

	// check if exists; if so, update
	tmpBuild, err := m.GetBuild(projectId, testId, buildId)
	if err != nil && err != ErrBuildDoesNotExist {
		return err
	}
	// update
	if tmpBuild != nil {
		if buildAction.Action == "stop" {
			tmpBuild.Status.Status = "stopped"
			tmpBuild.EndTime = time.Now()
			// go StopCurrentBuildFromClair
		}
		if buildAction.Action == "restart" {
			tmpBuild.Status.Status = "restarted"
			tmpBuild.EndTime = time.Now()
			// go RestartCurrentBuildFromClair

		}

		if _, err := r.Table(tblNameBuilds).Filter(map[string]string{"id": buildId}).Update(tmpBuild).RunWrite(m.session); err != nil {
			return err
		}

		eventType = "update-build"
	}

	m.logEvent(eventType, fmt.Sprintf("id=%s", buildId), []string{"security"})

	return nil

}

func (m DefaultManager) UpdateBuildResults(buildId string, results []*model.BuildResult) error {
	var eventType string
	build, err := m.GetBuildById(buildId)
	if err != nil {
		return err
	}
	for _, result := range results {
		build.Results = append(build.Results, result)
	}

	if _, err := r.Table(tblNameBuilds).Filter(map[string]string{"id": buildId}).Update(build).RunWrite(m.session); err != nil {
		return err
	}

	eventType = "update-build-results"

	m.logEvent(eventType, fmt.Sprintf("id=%s", buildId), []string{"security"})

	return nil
}
func (m DefaultManager) UpdateBuildStatus(buildId string, status string) error {
	log.Info("updating build status")
	var eventType string
	build, err := m.GetBuildById(buildId)
	if err != nil {
		return err
	}
	build.Status.Status = status

	log.Info("fetching from db")
	if _, err := r.Table(tblNameBuilds).Filter(map[string]string{"id": buildId}).Update(build).RunWrite(m.session); err != nil {
		return err
	}
	log.Info("fetched from db")

	eventType = "update-build-status"

	m.logEvent(eventType, fmt.Sprintf("id=%s", buildId), []string{"security"})
	log.Info("finished updating status")

	return nil
}
func (m DefaultManager) DeleteBuild(projectId string, testId string, buildId string) error {
	build, err := r.Table(tblNameBuilds).Filter(map[string]string{"id": buildId}).Delete().Run(m.session)
	defer build.Close()
	if err != nil {
		return err
	}
	if build.IsNil() {
		return ErrBuildDoesNotExist
	}

	m.logEvent("delete-build", fmt.Sprintf("id=%s", buildId), []string{"security"})

	return nil
}

func (m DefaultManager) DeleteAllBuilds() error {
	res, err := r.Table(tblNameBuilds).Delete().Run(m.session)

	defer res.Close()
	if err != nil {
		return err
	}

	return nil
}

func (m DefaultManager) FetchIDForImage(image string) (string, error) {
	localImages, err := apiClient.GetLocalImages(m.DockerClient().URL.String())
	if err != nil {
		log.Error(err)
		return "", err
	}

	var imageId string
	for _, localImage := range localImages {
		imageRepoTags := localImage.RepoTags
		for _, imageRepoTag := range imageRepoTags {
			if imageRepoTag == image {
				imageId = localImage.ID
			}
		}
	}

	return imageId, nil
}

func (m DefaultManager) CreateOrUpdateResults(id string, result *model.Result) error {
	existingResult, _ := m.GetResults(id)

	var err error

	if existingResult != nil {
		err = m.UpdateResult(id, result)
	} else {
		err = m.CreateResult(id, result)
	}

	return err
}


