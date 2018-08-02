const DGDToken = artifacts.require('./MockDGD.sol');
const DGDBadgeToken = artifacts.require('./MockBadge.sol');
const MockDgxStorage = artifacts.require('./MockDgxStorage.sol');
const MockDgx = artifacts.require('./MockDgx.sol');
const Types = artifacts.require('./Types.sol');
const MockDgxDemurrageReporter = artifacts.require('./MockDgxDemurrageReporter.sol');

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
    });
};
