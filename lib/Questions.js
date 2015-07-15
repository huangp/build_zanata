var constants = require('./constants');
var util = require('./util');

var purposeEnum = constants.purposeEnum;
var skipTestsEnum = constants.skipTestsEnum;
var finalResultEnum = constants.finalResultEnum;

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
      type: 'confirm',
      name: 'envEAP6_URL',
      message: "Do you have environment variable EAP6_URL defined (or defined in maven settings.xml as env.EAP6_URL)?",
      when: function(answers) {
        return answers.appserver === 'jbosseap6';
      }
    },
    {
      type: "input",
      name: "eap6URL",
      message: "What's the installation url",
      default: function () {
        return constants.eapInstallation();
      },
      when: function (answers) {
        return !answers.envEAP6_URL;
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
    },
    {
      type: "list",
      name: "webdriver.type",
      message: 'Which type of web driver to use?',
      choices: [
        'chrome',
        'firefox'
      ],
      default: 'chrome',
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

var historyQuestions = function(history) {
  var choices = Object.keys(history);
  return [
    {
      type: 'list',
      name: 'historyEntry',
      message: 'Pick one',
      choices: choices
    }
  ];
};



function finalResultQuestions(purpose) {
  var finalQuestionChoices = [
    {name: finalResultEnum.description(finalResultEnum.save), value: finalResultEnum.save},
    {name: finalResultEnum.description(finalResultEnum.done), value: finalResultEnum.done},
    {name: finalResultEnum.description(finalResultEnum.run), value: finalResultEnum.run},
    {name: finalResultEnum.description(finalResultEnum.saveAndRun), value: finalResultEnum.saveAndRun}
  ];

  if (purpose === purposeEnum.history) {
    finalQuestionChoices = [
      {name: finalResultEnum.description(finalResultEnum.done), value: finalResultEnum.done},
      {name: finalResultEnum.description(finalResultEnum.run), value: finalResultEnum.run}
    ];
  }

  return [
    {
      type: 'list',
      name: 'finalResult',
      message: 'What do you want to do with the result?',
      choices: finalQuestionChoices
    },
    {
      type: 'input',
      name: 'saveName',
      message: 'What name do you want it to save as?',
      when: function(answers) {
        return finalResultEnum.needToSave(answers.finalResult);
      }
    }
  ];
}


// ==== end questions ====



module.exports = function(purpose) {
  return {
    historyQuestions: historyQuestions,
    cleanBuildQuestion: cleanBuildQuestion,
    cargoQuestions: cargoQuestions(purpose),
    buildQuestions: buildQuestions(purpose),
    testQuestions: testQuestions,
    finalResultQuestions: finalResultQuestions(purpose)
  }
};
