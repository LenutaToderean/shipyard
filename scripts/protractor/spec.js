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
    createTestProviderDropdown: by.className('ui search fluid dropdown testProvider'),
    createTestProviderMenuTransitioner: by.className('menu transition visible'),
    createTestImagesToTest: by.css('[placeholder="All images"]'),
    createTestImagesToTestCSS: '[placeholder="All images"]',
    createTestSelectImageToTest: by.css('[data-value="busybox:latest"]'),
    createTestSelectImageToTestCSS: '[data-value="busybox:latest"]',
    createTestSaveButton: by.id('test-create-save-button'),
    editProjectBuildButtons: by.repeater('test in vm.tests'),
    editProjectLoadingMsgNegative: by.css('#content > div.ui.padded.grid.ng-scope > div > div > div.ui.icon.message.negative'),
    editProjectLoadingMsgNegativeCSS: '#content > div.ui.padded.grid.ng-scope > div > div > div.ui.icon.message.negative',
    editProjectLoadingMsg: by.css('#content > div.ui.padded.grid.ng-scope > div > div > div:nth-child(1)'),
    editProjectLoadingMsgCSS: '#content > div.ui.padded.grid.ng-scope > div > div > div:nth-child(1)'
};

function selectDropdownByNumber( mySelect, optionNum ) {
    element.findElements(by.tagName('option'))
        .then(function(options) {
            options[index].click();
        });
};

// TODO: Look into how protractor *knows* when our app is pending tasks. Can we remove the `browser.waits`?
//             - Protractor may not wait for operations other than http calls. This would explain why blocking sleep()'s drastically improve the success rate of these tests
// TODO: Look for variant of isElementVisible that actually works. Maybe drop to selenium?
// TODO: Changes browser.sleep's for browser.wait(protractor.ExpectedConditions.visibilityOf($('#create-test-selectize-label')), 60000);
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
        element(sy.createProjectName).sendKeys('Project1');
        element(sy.createProjectDescription).sendKeys('Description1');
        element(sy.createProjectButton).click();
        // browser.wait(protractor.until.elementLocated(sy.editProjectHeader), 15000);
    });

    it('project should be successfully created', function() {
        expect(
            element(sy.editProjectHeader).getText()
        ).toEqual(
            'Project Project1'
        );
    
        expect(
            element(sy.editProjectName).getAttribute('value')
        ).toEqual(
            'Project1'
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
        element(sy.editProjectName).sendKeys('Project2');
        element(sy.saveProjectButton).click();
        expect(
            element(sy.editProjectName).getAttribute('value')
        ).toEqual(
            'Project2'
        );
    });

    it('should open modal window for create image', function() {
        element(sy.createNewImageButton).click();
        browser.sleep(2000);
        expect(element(sy.createImageModal).isDisplayed()).toBe(true);
        expect(element(sy.createImageHeader).getText()).toEqual('Create Image');
    });

    it('should add new image from public registry', function() {
        element(sy.createImageLocation).click();
        element(sy.createImageLocationPublicReg).click();
        element(sy.createImageNameSearch).click();
        element(sy.createImageNameSearch).sendKeys('busybox');
        browser.wait(protractor.until.elementLocated(by.className('description')), 60000);
        browser.sleep(2000);
        element(by.className('description')).click();
        element(sy.createImageTag).click();
        browser.wait(protractor.until.elementLocated(by.id('tag-results')), 60000);
        browser.sleep(2000);
        element(by.id('tag-results')).click();
        element(sy.createImageDescription).sendKeys('image description');
        browser.wait(protractor.until.elementLocated(sy.createImageSave), 60000);
        browser.sleep(2000);
        element(sy.createImageSave).click();
    });

    it('should open the tests modal window', function() {
        browser.sleep(2000);
        element(sy.createNewTestButton).click();
        browser.sleep(2000);
        expect(element(sy.createTestModal).isDisplayed()).toBe(true);
        expect(element(sy.createTestHeader).getText()).toEqual('Create Test');
    });

    it('should add new test that references the image', function() {
        browser.sleep(2000);
        element(sy.createTestProviderDropdown).click();
        browser.wait(protractor.until.elementLocated(sy.createTestProviderMenuTransitioner), 60000);
        $('div[data-value="Clair [Internal]"]').click();
        browser.wait(protractor.ExpectedConditions.visibilityOf($(sy.createTestImagesToTestCSS)), 60000);
        element(sy.createTestImagesToTest).click();
        browser.wait(protractor.ExpectedConditions.visibilityOf($(sy.createTestSelectImageToTestCSS)), 60000);
        element(sy.createTestSelectImageToTest).click();
        element(sy.createTestSaveButton).click();
    });

    it('should be able to run the test', function() {
        browser.sleep(2000);
        // Click the play icon for the test
        element(sy.editProjectBuildButtons.row(0))
            .element(by.css('i[class="play icon"]')).click();
        // Wait for status messages / test to build
        browser.wait(protractor.ExpectedConditions.visibilityOf($(sy.editProjectLoadingMsgCSS)), 60000);
        // In this case, we expect the test to fail
        browser.wait(protractor.ExpectedConditions.visibilityOf($(sy.editProjectLoadingMsgNegativeCSS)), 60000);
        // Expect the message to have the `negative` class (sice build will fail)
        expect(element(sy.editProjectLoadingMsg).getAttribute('class')).toBe('ui icon message negative');
    });

});
