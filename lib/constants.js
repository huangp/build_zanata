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

module.exports = {
  eapInstallation: eapInstallation,
  cargoBasename: cargoBasename,
  skipTestsEnum: skipTestsEnum,
  purposeEnum: purposeEnum
};
