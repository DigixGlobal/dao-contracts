const DGDToken = artifacts.require('./MockDGD.sol');
const DGDBadgeToken = artifacts.require('./MockBadge.sol');

module.exports = async function (deployer, network) {
  deployer.deploy(DGDToken)
    .then(() => {
      return deployer.deploy(DGDBadgeToken);
    });
};
