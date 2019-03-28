const ContractResolver = artifacts.require('ContractResolver.sol');
const DaoStructs = artifacts.require('DaoStructs.sol');

const DaoRewardsStorage = artifacts.require('DaoRewardsStorage.sol');
const DaoWhitelistingStorage = artifacts.require('DaoWhitelistingStorage.sol');
const IntermediateResultsStorage = artifacts.require('IntermediateResultsStorage.sol');

module.exports = async (deployer, network) => {
  if (network !== 'mainnet' && network !== 'kovan') { return null; }
  deployer.link(DaoStructs, IntermediateResultsStorage)
    .then(() => {
      return deployer.link(DaoStructs, DaoRewardsStorage);
    })
    .then(() => {
      return deployer.deploy(DaoWhitelistingStorage, ContractResolver.address, { gas: 3000000 });
    })
    .then(() => {
      return deployer.deploy(DaoRewardsStorage, ContractResolver.address, { gas: 5000000 });
    })
    .then(() => {
      return deployer.deploy(IntermediateResultsStorage, ContractResolver.address, { gas: 4000000 });
    })
    .then(() => {
      console.log('Deployed Storage Part C');
    });
};
