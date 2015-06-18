//var fs = require('fs');

var inquirer = require('inquirer');
var constants = require('./lib/constants');
var util = require('./lib/util');
var Questions = require('./lib/questions');

var purposeEnum = constants.purposeEnum;
var mvnBuildcmd = ['mvn'];
var mvnCargoCmd = ['mvn'];

function main() {
  inquirer.prompt(
    [
      {
        type: "list",
        message: 'What do you want to do this time?',
        name: 'purpose',
        choices: [
          {name: 'Just build the war (no functional test)', value: purposeEnum.build},
          {name: 'Build the test war and run cargo wait for me', value: purposeEnum.cargoRun},
          {name: 'I\'ve got the test war just run cargo wait for me', value: purposeEnum.cargoRunOnly},
          {name: 'Run static analysis only', value: purposeEnum.staticAnalysisOnly},
          {name: 'Run test(s)', value: purposeEnum.test}
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
          inquirer.prompt(util.concatTwoArrays(questions.buildQuestions, questions.cargoQuestions), finalAnswerCallback);
          break;
        case purposeEnum.cargoRunOnly:
          q = questions.cargoQuestions;
          q.unshift(questions.cleanBuildQuestion);
          inquirer.prompt(q, finalAnswerCallback);
          break;
        case purposeEnum.test:
          q = util.concatTwoArrays(questions.buildQuestions, questions.testQuestions);
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
      mvnBuildcmd.push('-pl zanata-test-war -am');
      mvnBuildcmd.push('&& ');
      result = mvnBuildcmd.join(' ') + mvnCargoCmd.join(' ');
      break;
    case purposeEnum.build:
      mvnBuildcmd.push('-pl zanata-test-war -am');
      result = mvnBuildcmd.join(' ');
      break;
    case purposeEnum.cargoRunOnly:
      result = mvnCargoCmd.join(' ');
      break;
    case purposeEnum.test:
      if (!util.needToRunFunctionalTest(answers)) {
        mvnBuildcmd.push('-pl zanata-test-war -am');
      }
      if (util.needToRunIntegrationTest(answers) && answers.itCase) {

      }
      result = mvnBuildcmd.join(' ');
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
