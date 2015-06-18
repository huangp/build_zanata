var skipTestsEnum = require('./constants').skipTestsEnum;

function needToRunIntegrationTest(answer) {
  var skipTests = answer.skipTest || [];
  return skipTests.indexOf(skipTestsEnum.integration) < 0;
}

function needToRunFunctionalTest(answer) {
  var skipTests = answer.skipTest || [];
  return skipTests.indexOf(skipTestsEnum.functional) < 0;
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

exports.needToRunFunctionalTest = needToRunFunctionalTest;
exports.needToRunIntegrationTest = needToRunIntegrationTest;
exports.concatTwoArrays = concatArray;
