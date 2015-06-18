//var fs = require('fs');

var inquirer = require('inquirer');

var constants = require('./constants');
var purposeEnum = constants.purposeEnum;
var Questions = require('./questions');



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
          {name: 'Just build the war', value: purposeEnum.build},
          {name: 'Build the test war and run cargo wait for me', value: purposeEnum.cargoRun},
          {name: 'I\'ve got the test war just run cargo wait for me', value: purposeEnum.cargoRunOnly},
          {name: 'Run static analysis only', value: purposeEnum.staticAnalysisOnly},
          {name: 'Run test(s)', value: purposeEnum.staticAnalysisOnly}
        ]
      }
    ], function(answers) {
      var purpose = answers.purpose;
      var questions = new Questions(purpose);
      var finalAnswerCallback = constructMavenCommand.bind(this, purpose);
      switch (purpose) {
        case purposeEnum.build:
          inquirer.prompt(questions.buildQuestions, finalAnswerCallback);
          break;
        case purposeEnum.cargoRun:
          inquirer.prompt(concatArray(questions.buildQuestions, questions.cargoQuestions), finalAnswerCallback);
          break;
        case purposeEnum.cargoRunOnly:
          var q = questions.cargoQuestions;
          q.unshift(questions.cleanBuildQuestion);
          inquirer.prompt(q, finalAnswerCallback);
          break;
        case purposeEnum.test:
          inquirer.prompt(questions.buildQuestions, finalAnswerCallback);
          break;
        case purposeEnum.staticAnalysisOnly:
          console.log('mvn compile -DstaticAnalysis -Dnogwt');
          process.exit(0);
      }
    }
  );
}

exports.main = main;

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
