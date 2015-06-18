var assert = require('assert');
var skipTestsEnum = require('./constants').skipTestsEnum;

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

exports.needToRunFunctionalTest = needToRunFunctionalTest;
exports.needToRunIntegrationTest = needToRunIntegrationTest;
exports.concatArrays = concatArrays;
