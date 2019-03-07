const assert = require('assert');

const Migrations = artifacts.require('Migrations.sol');

const isInvalid = (param) => {
  return (param === '' || param === undefined);
};

module.exports = function (deployer, network) {
  if (network !== 'development') {
    assert.ok(!isInvalid(process.env.DGX_DEMURRAGE_REPORTER), 'Please provide the address for DGX_DEMURRAGE_REPORTER');
    assert.ok(!isInvalid(process.env.DGD), 'Please provide the address for DGD');
    assert.ok(!isInvalid(process.env.DGD_BADGE), 'Please provide the address for DGD_BADGE');
    assert.ok(!isInvalid(process.env.CV_1), 'Please provide the address for CV_1');
    assert.ok(!isInvalid(process.env.CV_2), 'Please provide the address for CV_2');
    assert.ok(!isInvalid(process.env.FUNDING_SOURCE), 'Please provide the address for FUNDING_SOURCE');
    assert.ok(!isInvalid(process.env.DGX), 'Please provide the address for DGX');
  }

  deployer.deploy(Migrations);
};
