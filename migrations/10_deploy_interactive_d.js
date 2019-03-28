const ContractResolver = artifacts.require('ContractResolver.sol');
const DaoStructs = artifacts.require('DaoStructs.sol');

const DaoRewardsManager = artifacts.require('DaoRewardsManager.sol');
const DaoRewardsManagerExtras = artifacts.require('DaoRewardsManagerExtras.sol');
const DaoInformation = artifacts.require('DaoInformation.sol');

module.exports = async (deployer, network) => {
  if (network !== 'mainnet' && network !== 'kovan') { return null; }
  deployer.link(DaoStructs, DaoRewardsManager)
    .then(() => {
      return deployer.deploy(DaoRewardsManager, ContractResolver.address, process.env.DGX, { gas: 8000000, gasPrice: 30e9 });
    })
    .then(() => {
      return deployer.deploy(DaoRewardsManagerExtras, ContractResolver.address, { gas: 5000000 });
    })
    .then(() => {
      return deployer.deploy(DaoInformation, ContractResolver.address, { gas: 5000000 });
    })
    .then(() => {
      console.log('Deployed Interactive Part D');
    });
};
