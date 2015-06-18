var fs = require('fs');

var inquirer = require('inquirer');

var eapInstallation = 'http://download.bne.redhat.com/released/JBEAP-6/6.4.0/jboss-eap-6.4.0.zip';
var cargoBasename = 'jboss-eap-6.4.0';

var skipTestsEnum = {
  unit: 'skipUnitTests',
  integration: 'skipArqTests',
  functional: 'skipFuncTests'
};

var purposeEnum = {
  build: 'build',
  cargoRun: 'cargoRun',
  cargoRunOnly: 'cargoRunOnly',
  staticAnalysisOnly: 'staticAnalysisOnly',
  test: 'runTest',
  needCargo: function(value) {
    return value === this.cargoRunOnly || value === this.cargoRun;
  }
};

var purpose = '';
var mvnBuildcmd = ['mvn'];
var mvnCargoCmd = ['mvn'];

// first we ask what's the main purpose
inquirer.prompt(
  [
    {
      type: "list",
      message: 'What do you want to do this time?',
      name: 'purpose',
      choices: [
        {name: 'Just build the war', value: purposeEnum.build},
        {name: 'Build the test war and run cargo wait for me', value: purposeEnum.cargoRun},
        {name: 'I\'ve got the test war just run cargo wait for me', value: purposeEnum.cargoRunOnly},
        {name: 'Run static analysis only', value: purposeEnum.staticAnalysisOnly},
        {name: 'Run test(s)', value: purposeEnum.staticAnalysisOnly}
      ]
    }
  ], function(answers) {
    purpose = answers.purpose;
    switch(purpose) {
      case purposeEnum.build:
        inquirer.prompt(buildQuestions, constructMavenCommand);
        break;
      case purposeEnum.cargoRun:
        inquirer.prompt(buildAndCargoRunQuestions(), constructMavenCommand);
        break;
      case purposeEnum.cargoRunOnly:
        cargoQuestions.unshift(cleanBuildQuestion);
        inquirer.prompt(cargoQuestions, constructMavenCommand);
        break;
      case purposeEnum.test:
        inquirer.prompt(buildQuestions, constructMavenCommand);
        break;
      case purposeEnum.staticAnalysisOnly:
        console.log('mvn compile -DstaticAnalysis -Dnogwt');
        process.exit(0);
    }
  }
);

function skipTestChoices() {
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
var staticAnalysisQuestion = {
  type: "confirm",
  name: "skipStaticAnalysis",
  message: "Do you want to skip static analysis?",
  default: true
};

var cleanBuildQuestion = {
  type: "confirm",
  name: "clean",
  message: "Do you want to run a clean build?",
  default: false
};

var buildQuestions = [
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
  staticAnalysisQuestion,
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
    choices: skipTestChoices
  }
];

var cargoQuestions = [
  {
    type: "list",
    message: "Select which app server you want to run against",
    name: "appserver",
    choices: [
      {name: "EAP", value: 'jbosseap6'},
      {name: "wildfly", value: 'wildfly8'}
    ],
    when: function (answers) {
      var skipTests = answers.skipTest;

      var hasTestNeedsAppServer = skipTests && skipTests.length > 0 &&
        !(skipTests.indexOf(skipTestsEnum.integration) > 0 &&
        skipTests.indexOf(skipTestsEnum.functional) > 0);
      return purposeEnum.needCargo(purpose) ||
        hasTestNeedsAppServer;
    }
  },
  {
    type: "input",
    name: "cargo.installation",
    message: "What's the installation url",
    default: function () {
      return eapInstallation;
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
      return cargoBasename;
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
// ==== end questions ====

function buildAndCargoRunQuestions() {
  return concatArray(buildQuestions, cargoQuestions);
}

function concatArray(arrayA, arrayB) {
  var result = [];
  arrayA.forEach(function(v) {
    result.push(v);
  });
  arrayB.forEach(function(v) {
    result.push(v);
  });
  return result;
}

function constructMavenCommand(answers) {
  var result;
  console.log('>> purpose: %s', purpose);
  console.log('>> answers: %s', JSON.stringify(answers, null, "  "));

  if (answers.clean) {
    buildMavenCommand(mvnBuildcmd, 'clean');
    buildMavenCommand(mvnCargoCmd, 'clean');
  }
  if (answers.nogwt) {
    addMavenArgument(mvnBuildcmd, 'nogwt');
  }
  if (answers.excludeFrontend) {
    addMavenArgument(mvnBuildcmd, 'excludeFrontend');
  }
  if (!answers.skipStaticAnalysis) {
    addMavenArgument(mvnBuildcmd, 'staticAnalysis');
  }
  addMavenArgument(mvnBuildcmd, answers.gwtProfile);
  if (purposeEnum.needCargo(purpose)) {
    addMavenArgument(mvnBuildcmd, answers.appserver);
    addExtractedArgumentFromAnswer(mvnBuildcmd, answers, 'cargo.installation');
    addExtractedArgumentFromAnswer(mvnBuildcmd, answers, 'cargo.basename');
    addMavenArgument(mvnCargoCmd, answers.appserver);
    addExtractedArgumentFromAnswer(mvnCargoCmd, answers, 'cargo.installation');
    addExtractedArgumentFromAnswer(mvnCargoCmd, answers, 'cargo.basename');
    addExtractedArgumentFromAnswer(mvnCargoCmd, answers, 'mysql.port');
  }

  console.log('>>>> the generated the maven command is:');
  mvnBuildcmd.push('-pl zanata-test-war -am');

  if (answers.skipTest && answers.skipTest.length > 0) {
    answers.skipTest.forEach(function(value) {
      addMavenArgument(mvnBuildcmd, value);
    });

    if (answers.skipTest.length == 3) {
      // skip all tests
      mvnBuildcmd.push('package');
    } else {
      mvnBuildcmd.push('verify');
    }
  }

  mvnCargoCmd.push('-pl functional-test package cargo:run');

  switch(purpose) {
    case purposeEnum.cargoRun:
      mvnBuildcmd.push('&& ');
      result = mvnBuildcmd.join(' ') + mvnCargoCmd.join(' ');
      break;
    case purposeEnum.build:
      result = mvnBuildcmd.join(' ');
      break;
    case purposeEnum.cargoRunOnly:
      result = mvnCargoCmd.join(' ');
      break;
  }

  console.log(result);
}

function buildMavenCommand(mvnCmdArray) {
  var args = Array.prototype.slice.call(arguments).slice(1);
  args.forEach(function(arg) {
    mvnCmdArray.push(arg);
  });
}

function addMavenArgument(mvnCmdArray) {
  var args = Array.prototype.slice.call(arguments).slice(1);
  args.forEach(function(arg) {
    if (arg) {
      mvnCmdArray.push('-D' + arg);
    }
  });
}

function addExtractedArgumentFromAnswer(mvnCmdArray, answers, key) {
  if (answers[key]) {
    mvnCmdArray.push('-D' + key + '=' + answers[key]);
  }
}
