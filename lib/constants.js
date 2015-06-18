
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

module.exports = {
  eapVersion: '6.4.0',
  eapInstallation: function() {
    return 'http://download.bne.redhat.com/released/JBEAP-6/' + this.eapVersion + '/jboss-eap-' + this.eapVersion + '.zip';
  },
  cargoBasename: function() {
    return 'jboss-eap-' + this.eapVersion;
  },
  skipTestsEnum: skipTestsEnum,
  purposeEnum: purposeEnum
};
