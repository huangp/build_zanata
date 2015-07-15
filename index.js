//var fs = require('fs');

var inquirer = require('inquirer');
var constants = require('./lib/constants');
var util = require('./lib/util');
var Questions = require('./lib/Questions');

var purposeEnum = constants.purposeEnum;
var finalResultEnum = constants.finalResultEnum;
var mvnBuildCmd = ['mvn'];
var mvnCargoCmd = ['mvn'];

var history;

function main() {
  util.readFromHistory(function (data) {
    if (data) {
      history = data;
    }
    ask();
  });

}

function ask() {
  var historyChoice = {name: '[History]         Pick from history', value: purposeEnum.history};
  var choices = [
    {name: '[Build]           Just build the war (no functional test)', value: purposeEnum.build},
    {name: '[Build and Cargo] Build the test war and run cargo wait for me', value: purposeEnum.cargoRun},
    {name: '[Cargo]           I\'ve got the test war just run cargo wait for me', value: purposeEnum.cargoRunOnly},
    {name: '[Static Analysis] Run static analysis only', value: purposeEnum.staticAnalysisOnly},
    {name: '[Test]            Run test(s)', value: purposeEnum.test}
  ];

  if (history) {
    choices.push(historyChoice);
  }

  inquirer.prompt(
    [
      {
        type: "list",
        message: 'What do you want to do this time?',
        name: 'purpose',
        choices: choices
      }
    ], function(answers) {
      var purpose = answers.purpose;
      var questions = new Questions(purpose);
      var finalAnswerCallback = constructMavenCommand.bind(this, purpose, questions.finalResultQuestions);
      var q;
      switch (purpose) {
        case purposeEnum.history:
          inquirer.prompt(questions.historyQuestions(history), finalAnswerCallback);
          break;
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
          inquirer.prompt([], finalAnswerCallback);
        //  console.log('mvn compile -DstaticAnalysis -Dnogwt');
      }
    }
  );
}


function constructMavenCommand(purpose, finalResultQuestions, answers) {
  var result;
  console.log('>> purpose: %s', purpose);
  // handle special history entry case. Ugly...
  if (answers.historyEntry) {
    answers = history[answers.historyEntry];
    console.log('>> answers: %s', JSON.stringify(answers, null, "  "));
    console.log(answers.mvn);
    inquirer.prompt(finalResultQuestions, finalResult.bind(this, answers, answers.mvn));
    return;
  }
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
  if (answers.exploded) {
    mvnBuildCmd.push('-Denv=dev');
  }
  addMavenArgument(mvnBuildCmd, answers.gwtProfile);
  if (purposeEnum.needCargo(purpose)) {
    // build command
    addExtractedArgumentFromAnswer(mvnBuildCmd, answers, 'appserver');

    // cargo command
    addExtractedArgumentFromAnswer(mvnCargoCmd, answers, 'appserver');
    addExtractedArgumentFromAnswer(mvnCargoCmd, answers, 'mysql.port');
    addExtractedArgumentFromAnswer(mvnCargoCmd, answers, 'webdriver.type');
  }

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
    case purposeEnum.staticAnalysisOnly:
      result = 'mvn compile -DstaticAnalysis -Dnogwt';
      break;
  }

  console.log('>>>> the generated the maven command is:');
  console.log(result);
  inquirer.prompt(finalResultQuestions, finalResult.bind(this, answers, result));
}

function finalResult(buildAnswers, mvnCmd, finalAnswers) {
  if (finalAnswers.saveName) {
    util.saveAs(finalAnswers.saveName, buildAnswers, mvnCmd);
  }
  if (finalResultEnum.needToRun(finalAnswers.finalResult)) {
    util.runCommand(mvnCmd, buildAnswers.eap6URL);
  }
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
