var path = require('path');

var skipTestsEnum = {
  unit: 'skipUnitTests',
  integration: 'skipArqTests',
  functional: 'skipFuncTests'
};

var purposeEnum = {
  history: 'history',
  build: 'build',
  cargoRun: 'cargoRun',
  cargoRunOnly: 'cargoRunOnly',
  staticAnalysisOnly: 'staticAnalysisOnly',
  test: 'runTest',
  needCargo: function(value) {
    return value === this.cargoRunOnly || value === this.cargoRun;
  }
};

var finalResultEnum = {
  save: 'save', run: 'run', saveAndRun: 'saveAndRun', done: 'done',
  description: function(value) {
    switch (value) {
      case this.save:
        return 'Save as history and done';
      case this.run:
        return 'Run it for me';
      case this.saveAndRun:
        return 'Save then run it for me';
      case this.done:
        return 'Done';
    }
  },
  needToSave: function(value) {
    return value && (value === this.save || value === this.saveAndRun);
  },
  needToRun: function(value) {
    return value && (value === this.run || value === this.saveAndRun);
  }
};

var home =  process.env.HOME || process.env.USERPROFILE;
var historyFile = path.join(home, '.config', 'build_zanata.json');

module.exports = {
  eapVersion: '6.4.2.GA',
  wildflyVersion: '9.0.1.Final',
  eapInstallation: function() {
    return 'http://download.bne.redhat.com/released/JBEAP-6/' + this.eapVersion + '/jboss-eap-' + this.eapVersion + '.zip';
  },
  skipTestsEnum: skipTestsEnum,
  purposeEnum: purposeEnum,
  finalResultEnum: finalResultEnum,
  historyFile: historyFile
};
