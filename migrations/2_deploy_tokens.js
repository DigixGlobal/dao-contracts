const DGDToken = artifacts.require('./MockDgd.sol');
const DGDBadgeToken = artifacts.require('./MockBadge.sol');
const MockDgxStorage = artifacts.require('./MockDgxStorage.sol');
const MockDgx = artifacts.require('./MockDgx.sol');
const Types = artifacts.require('./Types.sol');
const MockDgxDemurrageReporter = artifacts.require('./MockDgxDemurrageReporter.sol');
const MockNumberCarbonVoting1 = artifacts.require('./NumberCarbonVoting1.sol');
const MockNumberCarbonVoting2 = artifacts.require('./NumberCarbonVoting2.sol');

module.exports = async function (deployer, network, accounts) {
  if ((network !== 'development') || process.env.SKIP) { return null; }
  deployer.deploy(DGDToken)
    .then(() => {
      return deployer.deploy(DGDBadgeToken);
    })
    .then(() => {
      return deployer.deploy(MockDgxStorage);
    })
    .then(() => {
      return deployer.deploy(MockDgx, MockDgxStorage.address, accounts[15]);
    })
    .then(() => {
      return deployer.deploy(Types);
    })
    .then(() => {
      return deployer.link(Types, MockDgxDemurrageReporter);
    })
    .then(() => {
      return deployer.deploy(MockDgxDemurrageReporter, MockDgx.address);
    })
    .then(() => {
      deployer.deploy(MockNumberCarbonVoting1, 'carbonVoting1');
      return deployer.deploy(MockNumberCarbonVoting2, 'carbonVoting2');
    });
};
