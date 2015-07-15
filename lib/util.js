var assert = require('assert');
var constants = require('./constants');
var skipTestsEnum = constants.skipTestsEnum;
var fs = require('fs');
var StreamSplitter = require("stream-splitter");
var child = require('child_process').spawn;
var historyFile = constants.historyFile;

function needToRunIntegrationTest(answer) {
  var skipTests = answer.skipTest || [];
  return skipTests.indexOf(skipTestsEnum.integration) < 0;
}

function needToRunFunctionalTest(answer) {
  var skipTests = answer.skipTest || [];
  return skipTests.indexOf(skipTestsEnum.functional) < 0;
}

function concatArrays() {
  var result = [];
  var arrays = Array.prototype.slice.call(arguments);
  arrays.forEach(function (array) {
    assert(array.constructor === Array, 'You must pass in arrays as arguments!');
    array.forEach(function(v) {
      result.push(v);
    });
  });

  return result;
}

function saveAs(name, buildAnswers, mvnCmd) {
  var history = {};
  buildAnswers.mvn = mvnCmd;

  fs.readFile(historyFile, {encoding: 'utf8'}, function(err, content) {
    if (err) {
      console.log('err', err);
      history[name] = buildAnswers;
    } else {
      history = JSON.parse(content);
      if (history[name]) {
        console.warn('>> replacing existing entry!');
      }
      history[name] = buildAnswers;
    }
    //console.log('saving: %s', JSON.stringify(history, null, "  "));
    writeToFile(history);
  });
}

function writeToFile(history) {
  fs.writeFile(historyFile, JSON.stringify(history, null, "  "), {encoding: 'utf8'}, function(err) {
    if (err) {
      console.error('>> Failed saving history file: %s', historyFile);
      throw err;
    }
  });
}

function readFromHistory(cb) {
  fs.readFile(historyFile, {encoding: 'utf8'}, function (err, content) {
    if (err) {
      cb();
    } else {
      var history = JSON.parse(content);
      cb(history);
    }
  });
}

function runCommand(mvnCmd, eapUrl) {
  var option = eapUrl ? {env: {EAP6_URL: eapUrl}} : {};
  var mvn = child('bash', ['-c', mvnCmd], option);
  var splitter = mvn.stdout.pipe(StreamSplitter('\n'));

  mvn.stdout.setEncoding('utf8');
  splitter.encoding = "utf8";

  splitter.on('token', function(token) {
    console.log(token);
  });

  splitter.on('done', function() {
    console.log(">> mvn done ");
  });

  splitter.on('error', function(err) {
    // Any errors that occur on a source stream will be emitted on the
    // splitter Stream, if the source stream is piped into the splitter
    // Stream, and if the source stream doesn't have any other error
    // handlers registered.
    console.error('Oh no!', err);
  });

  mvn.on('close', function (code) {
    console.log('>> child process exited with code ' + code);
  });
}

exports.needToRunFunctionalTest = needToRunFunctionalTest;
exports.needToRunIntegrationTest = needToRunIntegrationTest;
exports.concatArrays = concatArrays;
exports.saveAs = saveAs;
exports.runCommand = runCommand;
exports.readFromHistory = readFromHistory;
