var config = {
    projectName: 'Selenium Project',
    projectNameOnEdit: 'Selenium Project Edited',
    testName: 'Pied Piper',
    imageName: 'alpine',
    tag: 'latest'
};
// TODO: change selectors to id/model/repeaters
var sy = {
    usernameInputField: by.model('vm.username'),
    passwordInputField: by.model('vm.password'),
    loginSubmitButton: by.css('.ui.blue.submit.button'),
    ilmButton: by.id('ilm-button'),
    createNewProjectButton: by.id('create-new-project-button'),
    createProjectButton: by.id('create-project-button'),
    createProjectName: by.id('create-project-name'),
    createProjectDescription: by.model('vm.project.description'),
    editProjectHeader: by.id('edit-project-header'),
    editProjectName: by.model('vm.project.name'),
    editProjectDescription: by.model('vm.project.description'),
    saveProjectButton: by.id('edit-project-save-project'),
    editProjectSaveSuccess: by.id('edit-project-save-success'),
    editProjectSaveFailure: by.id('edit-project-save-failure'),
    createNewImageButton: by.id('create-new-image-button'),
    createNewTestButton: by.id('create-new-test-button'),
    createImageModal: by.className('ui fullscreen modal transition create image'),
    createImageHeader: by.id('create-image-header'),
    createImageLocation: by.id('create-image-location'),
    createImageLocationPublicReg: by.id('create-image-location-public-reg'),
    createImageNameSearch: by.id('create-image-name-search'),
    createImageTag: by.id('create-image-tag'),
    createImageDescription: by.model('vm.createImage.description'),
    createImageSave: by.id('create-image-save'),
    createTestModal: by.className('ui fullscreen modal transition create test'),
    createTestHeader: by.id('create-test-header'),
    createTestDisplayName: by.id("create-test-display-name"),
    createTestProviderDropdown: by.className('ui search fluid dropdown testProvider'),
    createTestProviderMenuTransitioner: by.className('menu transition visible'),
    createTestImagesToTest: by.css('[placeholder="All images"]'),
    createTestImagesToTestCSS: '[placeholder="All images"]',
    createTestSelectImageToTest: by.css('[data-value="' + config.imageName + ':' + config.tag + '"]'),
    createTestSelectImageToTestCSS: '[data-value="' + config.imageName + ':' + config.tag + '"]',
    createTestSaveButton: by.id('test-create-save-button'),
    editProjectBuildButtons: by.repeater('test in vm.tests'),
    editProjectLoadingMsgNegative: by.css('#content > div.ui.padded.grid.ng-scope > div > div > div.ui.icon.message.negative'),
    editProjectLoadingMsgNegativeCSS: '#content > div.ui.padded.grid.ng-scope > div > div > div.ui.icon.message.negative',
    editProjectLoadingMsg: by.css('#content > div.ui.padded.grid.ng-scope > div > div > div:nth-child(1)'),
    editProjectLoadingMsgCSS: '#content > div.ui.padded.grid.ng-scope > div > div > div:nth-child(1)',
    editProjectGoToProjectsButton: by.css('#content > div.ui.padded.grid.ng-scope > div > div > div.ui.segment.page > div > div.column.row > div > h3 > span > a'),
    projectListTableOfProjects: by.repeater('a in filteredProjects = (vm.projects | filter:tableFilter)'),
    inspectViewBuilds: by.repeater('test in vm.results.testResults'),
    inspectViewTestName: by.id('inspect-view-test-name')
};

// TODO: Let's try to comment each step. Even with descriptive names, it's kind of hard to follow

describe('ILM', function() {
    it('should have a title', function() {
        // TODO: this port might change in the future or could be random in CI environment
        browser.get('http://'+process.env.DOCKER_HOST+':8082');
        expect(browser.getTitle()).toEqual('shipyard');
    });

    it('should be able to login', function() {
        element(sy.usernameInputField).sendKeys('admin ');
        element(sy.passwordInputField).sendKeys('shipyard');
        element(sy.loginSubmitButton).click();
        // browser.wait(protractor.until.elementLocated(sy.ilmButton), 15000);
    });

    it('should be able to navigate to project list', function() {
        element(sy.ilmButton).click();
        // browser.wait(protractor.until.elementLocated(sy.createNewProjectButton), 15000);
    });

    it('should be able to navigate to the project create view', function() {
        element(sy.createNewProjectButton).click();
        // browser.wait(protractor.until.elementLocated(sy.createProjectButton), 15000);
    });
    
    it('should be able to create a new project', function() {
        element(sy.createProjectName).sendKeys(config.projectName);
        element(sy.createProjectDescription).sendKeys('Description1');
        element(sy.createProjectButton).click();
        // browser.wait(protractor.until.elementLocated(sy.editProjectHeader), 15000);
    });

    it('project should be successfully created', function() {
        expect(
            element(sy.editProjectHeader).getText()
        ).toEqual(
            'Project ' + config.projectName
        );
    
        expect(
            element(sy.editProjectName).getAttribute('value')
        ).toEqual(
            config.projectName
        );
    
        expect(
            element(sy.editProjectDescription).getAttribute('value')
        ).toEqual(
            'Description1'
        );
    });

    it('should be able to modify an existing project', function() {
        expect(element(sy.saveProjectButton).getAttribute('class')).toEqual('ui small disabled button');
        element(sy.editProjectName).clear();
        element(sy.editProjectName).sendKeys(config.projectNameOnEdit);
        element(sy.saveProjectButton).click();
        expect(
            element(sy.editProjectName).getAttribute('value')
        ).toEqual(
            config.projectNameOnEdit
        );
    });

    it('should open modal window for create image', function() {
        element(sy.createNewImageButton).click();
        // browser.sleep(2000);
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(sy.createImageModal)), 60000);
        expect(element(sy.createImageModal).isDisplayed()).toBe(true);
        expect(element(sy.createImageHeader).getText()).toEqual('Create Image');
    });

    it('should add new image from public registry', function() {
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(sy.createImageLocation), 60000));
        element(sy.createImageLocation).click();
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(sy.createImageLocationPublicReg), 60000));
        element(sy.createImageLocationPublicReg).click();
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(sy.createImageNameSearch), 60000));
        element(sy.createImageNameSearch).click();
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(sy.createImageNameSearch), 60000));
        element(sy.createImageNameSearch).sendKeys(config.imageName);
        browser.wait(protractor.until.elementLocated(by.className('description')), 180000);
        browser.wait(protractor.ExpectedConditions.visibilityOf(element.all(by.className('description')).get(0), 60000));
        element.all(by.className('description')).get(0).click();
        element(sy.createImageTag).click();
        browser.wait(protractor.until.elementLocated(by.id('tag-results')), 180000);
        browser.wait(protractor.ExpectedConditions.visibilityOf(element.all(by.id('tag-results')).get(0), 60000));
        element.all(by.id('tag-results')).get(0).click();
        element(sy.createImageDescription).sendKeys('image description');
        browser.wait(protractor.until.elementLocated(sy.createImageSave), 180000);
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(sy.createImageSave), 60000));
        element(sy.createImageSave).click();
    });

    it('should open the tests modal window', function() {
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(sy.createNewTestButton), 60000));
        browser.wait(protractor.ExpectedConditions.elementToBeClickable(element(sy.createNewTestButton), 60000));
        element(sy.createNewTestButton).click();
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(sy.createTestModal), 60000));
        expect(element(sy.createTestModal).isDisplayed()).toBe(true);
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(sy.createTestHeader), 60000));
        expect(element(sy.createTestHeader).getText()).toEqual('Create Test');
    });
    
    it('should add new test that references the image', function() {
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(sy.createTestProviderDropdown), 60000));
        element(sy.createTestProviderDropdown).click();
        browser.wait(protractor.until.elementLocated(sy.createTestProviderMenuTransitioner), 60000);
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(by.css('div[data-value="Clair [Internal]"]')), 60000));
        $('div[data-value="Clair [Internal]"]').click();
        browser.wait(protractor.ExpectedConditions.visibilityOf($(sy.createTestImagesToTestCSS)), 60000);
        element(sy.createTestImagesToTest).click();
        browser.wait(protractor.ExpectedConditions.visibilityOf($(sy.createTestSelectImageToTestCSS)), 60000);
        element(sy.createTestSelectImageToTest).click();
        element(sy.createTestDisplayName).sendKeys(config.testName);
        browser.sleep(2000);
        expect(
            element(sy.createTestDisplayName).getAttribute('value')
        ).toEqual(
            config.testName
        );
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(sy.createTestSaveButton), 60000));
        element(sy.createTestSaveButton).click();
    });
    
    it('should be able to run the test', function() {
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(sy.editProjectBuildButtons.row(0)), 60000));
        // Click the play icon for the test
        element(sy.editProjectBuildButtons.row(0))
            .element(by.css('i[class="play icon"]')).click();
        // Wait for status messages / test to build
        browser.wait(protractor.ExpectedConditions.visibilityOf($(sy.editProjectLoadingMsgCSS)), 60000);
        // In this case, we expect the test to fail
        browser.wait(protractor.ExpectedConditions.visibilityOf($(sy.editProjectLoadingMsgNegativeCSS)), 600000);
        // Expect the message to have the `negative` class (sice build will fail)
        expect(element(sy.editProjectLoadingMsg).getAttribute('class')).toBe('ui icon message negative');
    });
    
    it('should be able return to project listing via the `Go To Projects` icon', function() {
        browser.wait(protractor.ExpectedConditions.visibilityOf(element(sy.editProjectGoToProjectsButton), 60000));
        // Click the `Go To Projects` button
        element(sy.editProjectGoToProjectsButton).click();
        // Wait for
        var projectName = element.all(sy.projectListTableOfProjects).get(-1)
            .element(by.css('#project-name'));
        browser.wait(protractor.ExpectedConditions.visibilityOf(projectName, 60000));
    });
    
    it('should be able to enter the project"s inspect view', function() {
        browser.wait(protractor.ExpectedConditions.visibilityOf(element.all(sy.projectListTableOfProjects).get(-1), 60000));
        // Click the `inspect` button for the project
        element.all(sy.projectListTableOfProjects).get(-1)
            .element(by.className('search icon')).click();
        // Wait for the inspect view to load and assert success
        var inspectHeader = element(by.css('.ui.header .content'));
        browser.wait(protractor.ExpectedConditions.visibilityOf(inspectHeader, 60000));
        expect(inspectHeader.getText()).toEqual('Project Results');
    });
    
    it('should have the build we just ran', function() {
        browser.wait(protractor.ExpectedConditions.visibilityOf(element.all(sy.inspectViewBuilds).get(-1), 60000));
        // Click the `inspect` button for the project
        var lastBuild = element.all(sy.inspectViewBuilds).get(-1);
        expect(
            lastBuild.element(sy.inspectViewTestName).getText()
        ).toEqual(
            config.testName
        );
    });

});
