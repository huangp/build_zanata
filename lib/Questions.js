var constants = require('./constants');
var util = require('./util');

var purposeEnum = constants.purposeEnum;
var skipTestsEnum = constants.skipTestsEnum;

function skipTestChoices(purpose) {
  var cargoRun = purpose === purposeEnum.cargoRun;
  var skipFuncTest = {
    name: "functional test",
    value: skipTestsEnum.functional
  };
  var choices = [
    {
      name: 'unit test',
      value: skipTestsEnum.unit,
      checked: cargoRun
    },
    {
      name: "integration test",
      value: skipTestsEnum.integration,
      checked: cargoRun
    }
  ];
  if (!cargoRun) {
    choices.push(skipFuncTest);
  }
  return choices;
}
// ==== questions ====
var cleanBuildQuestion = {
  type: "confirm",
  name: "clean",
  message: "Do you want to run a clean build?",
  default: false
};

function buildQuestions(purpose) {
  return [
    cleanBuildQuestion,
    {
      type: "confirm",
      name: "nogwt",
      message: "Do you want to skip GWT compilation?",
      default: function() {
        return purpose != purposeEnum.build && purpose != purposeEnum.cargoRun;
      }
    },
    {
      type: "confirm",
      name: "excludeFrontend",
      message: "Do you want to skip frontend module?",
      default: true
    },
    {
      type: "confirm",
      name: "skipStaticAnalysis",
      message: "Do you want to skip static analysis?",
      default: true
    },
    {
      type: "list",
      message: "Select which GWT profile you want to compile",
      name: "gwtProfile",
      choices: [
        {name: "firefox", value: 'firefox'},
        {name: "chrome", value: 'chrome'},
        {name: "firefox and chrome", value: 'chromefirefox'},
        {name: "everything", value: ''}
      ],
      when: function (answers) {
        return !answers.nogwt;
      }
    },
    {
      type: "checkbox",
      message: "Select tests you want to skip",
      name: "skipTest",
      choices: skipTestChoices.bind(this, purpose)
    },
    {
      type: 'confirm',
      message: 'exploded war and copy to deployment folder?',
      name: 'exploded',
      default: true,
      when: function(answers) {
        return purpose === purposeEnum.build || purpose === purposeEnum.cargoRun;
      }
    }
  ];
}


function cargoQuestions(purpose) {
  return [
    {
      type: "list",
      message: "Select which app server you want to run against",
      name: "appserver",
      choices: [
        {name: "EAP", value: 'jbosseap6'},
        {name: "wildfly", value: 'wildfly8'}
      ],
      when: function (answers) {
        var hasTestNeedsAppServer = util.needToRunIntegrationTest(answers) || util.needToRunFunctionalTest(answers);
        return purposeEnum.needCargo(purpose) || hasTestNeedsAppServer;
      }
    },
    {
      type: "input",
      name: "cargo.installation",
      message: "What's the installation url",
      default: function () {
        return constants.eapInstallation();
      },
      when: function (answers) {
        return answers.appserver === 'jbosseap6';
      }
    },
    {
      type: "input",
      name: "cargo.basename",
      message: "What's the basename of your cargo installation",
      default: function () {
        return constants.cargoBasename();
      },
      when: function (answers) {
        return answers.appserver === 'jbosseap6';
      }
    },
    {
      type: "input",
      name: "mysql.port",
      message: 'Customize mysql port number?',
      default: 13306,
      when: function() {
        return purposeEnum.needCargo(purpose);
      }
    }

  ];
}



var testQuestions = [
  {
    type: 'confirm',
    message: 'Do you want to run specific (single or glob matched) test(s)?',
    name: 'runSpecificTest',
    default: false,
    when: function (answer) {
      return answer.skipTest.length < 3;
    }
  },
  {
    type: "input",
    name: "itCase",
    message: "What integration test(s)?",
    when: function (answers) {
      return answers.runSpecificTest && util.needToRunIntegrationTest(answers);
    }
  },
  {
    type: "input",
    name: "functionalTestPattern",
    message: "What functional test(s)?",
    when: function (answers) {
      return answers.runSpecificTest && util.needToRunFunctionalTest(answers);
    }
  }
];
// ==== end questions ====



module.exports = function(purpose) {
  return {
    cleanBuildQuestion: cleanBuildQuestion,
    cargoQuestions: cargoQuestions(purpose),
    buildQuestions: buildQuestions(purpose),
    testQuestions: testQuestions
  }
};
