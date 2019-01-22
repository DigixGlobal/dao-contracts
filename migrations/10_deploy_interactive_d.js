const ContractResolver = artifacts.require('ContractResolver.sol');
const DaoStructs = artifacts.require('DaoStructs.sol');

const DaoRewardsManager = artifacts.require('DaoRewardsManager.sol');
const DaoRewardsManagerExtras = artifacts.require('DaoRewardsManagerExtras.sol');
const DaoInformation = artifacts.require('DaoInformation.sol');

module.exports = async (deployer, network) => {
  if (network !== 'mainnet') { return null; }
  deployer.link(DaoStructs, DaoRewardsManager)
    .then(() => {
      return deployer.deploy(DaoRewardsManager, ContractResolver.address, process.env.DGX);
    })
    .then(() => {
      return deployer.deploy(DaoRewardsManagerExtras, ContractResolver.address);
    })
    .then(() => {
      return deployer.deploy(DaoInformation, ContractResolver.address);
    })
    .then(() => {
      console.log('Deployed Interactive Part D');
    });
};
