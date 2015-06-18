//var fs = require('fs');

var inquirer = require('inquirer');
var constants = require('./lib/constants');
var util = require('./lib/util');
var Questions = require('./lib/questions');

var purposeEnum = constants.purposeEnum;
var mvnBuildCmd = ['mvn'];
var mvnCargoCmd = ['mvn'];

function main() {
  inquirer.prompt(
    [
      {
        type: "list",
        message: 'What do you want to do this time?',
        name: 'purpose',
        choices: [
          {name: '[Build]           Just build the war (no functional test)', value: purposeEnum.build},
          {name: '[Build and Cargo] Build the test war and run cargo wait for me', value: purposeEnum.cargoRun},
          {name: '[Cargo]           I\'ve got the test war just run cargo wait for me', value: purposeEnum.cargoRunOnly},
          {name: '[Static Analysis] Run static analysis only', value: purposeEnum.staticAnalysisOnly},
          {name: '[Test]            Run test(s)', value: purposeEnum.test}
        ]
      }
    ], function(answers) {
      var purpose = answers.purpose;
      var questions = new Questions(purpose);
      var finalAnswerCallback = constructMavenCommand.bind(this, purpose);
      var q;
      switch (purpose) {
        case purposeEnum.build:
          inquirer.prompt(questions.buildQuestions, finalAnswerCallback);
          break;
        case purposeEnum.cargoRun:
          inquirer.prompt(util.concatArrays(questions.buildQuestions, questions.cargoQuestions), finalAnswerCallback);
          break;
        case purposeEnum.cargoRunOnly:
          q = questions.cargoQuestions;
          q.unshift(questions.cleanBuildQuestion);
          inquirer.prompt(q, finalAnswerCallback);
          break;
        case purposeEnum.test:
          q = util.concatArrays(questions.buildQuestions, questions.cargoQuestions, questions.testQuestions);
          inquirer.prompt(q, finalAnswerCallback);
          break;
        case purposeEnum.staticAnalysisOnly:
          console.log('mvn compile -DstaticAnalysis -Dnogwt');
      }
    }
  );
}


function constructMavenCommand(purpose, answers) {
  var result;
  console.log('>> purpose: %s', purpose);
  console.log('>> answers: %s', JSON.stringify(answers, null, "  "));

  if (answers.clean) {
    buildMavenCommand(mvnBuildCmd, 'clean');
    buildMavenCommand(mvnCargoCmd, 'clean');
  }
  if (answers.nogwt) {
    addMavenArgument(mvnBuildCmd, 'nogwt');
  }
  if (answers.excludeFrontend) {
    addMavenArgument(mvnBuildCmd, 'excludeFrontend');
  }
  if (!answers.skipStaticAnalysis) {
    addMavenArgument(mvnBuildCmd, 'staticAnalysis');
  }
  addMavenArgument(mvnBuildCmd, answers.gwtProfile);
  if (purposeEnum.needCargo(purpose)) {
    addMavenArgument(mvnBuildCmd, answers.appserver);
    addExtractedArgumentFromAnswer(mvnBuildCmd, answers, 'cargo.installation');
    addExtractedArgumentFromAnswer(mvnBuildCmd, answers, 'cargo.basename');
    addMavenArgument(mvnCargoCmd, answers.appserver);
    addExtractedArgumentFromAnswer(mvnCargoCmd, answers, 'cargo.installation');
    addExtractedArgumentFromAnswer(mvnCargoCmd, answers, 'cargo.basename');
    addExtractedArgumentFromAnswer(mvnCargoCmd, answers, 'mysql.port');
  }

  console.log('>>>> the generated the maven command is:');

  if (answers.skipTest && answers.skipTest.length > 0) {
    answers.skipTest.forEach(function(value) {
      addMavenArgument(mvnBuildCmd, value);
    });
  }
  if (answers.skipTest && answers.skipTest.length == 3) {
    // skip all tests
    mvnBuildCmd.push('package');
  } else {
    mvnBuildCmd.push('verify');
  }

  mvnCargoCmd.push('-pl functional-test package cargo:run');

  switch(purpose) {
    case purposeEnum.cargoRun:
      mvnBuildCmd.push('-pl zanata-test-war -am');
      mvnBuildCmd.push('&& ');
      result = mvnBuildCmd.join(' ') + mvnCargoCmd.join(' ');
      break;
    case purposeEnum.build:
      mvnBuildCmd.push('-pl zanata-test-war -am');
      result = mvnBuildCmd.join(' ');
      break;
    case purposeEnum.cargoRunOnly:
      result = mvnCargoCmd.join(' ');
      break;
    case purposeEnum.test:
      if (!util.needToRunFunctionalTest(answers)) {
        mvnBuildCmd.push('-pl zanata-test-war -am');
      }
      if (util.needToRunIntegrationTest(answers) && answers.itCase) {
        mvnBuildCmd.push('-Dit.test="' + answers.itCase + '"');
      }
      if (util.needToRunFunctionalTest(answers) && answers.functionalTestPattern) {
        mvnBuildCmd.push('-Dinclude.test.patterns="' + answers.functionalTestPattern + '"');
      }
      result = mvnBuildCmd.join(' ');
      break;
  }

  console.log();
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

exports.main = main;
