const ContractResolver = artifacts.require('ContractResolver.sol');

const Dao = artifacts.require('Dao.sol');
const DaoSpecialProposal = artifacts.require('DaoSpecialProposal.sol');

module.exports = async (deployer, network) => {
  if (network !== 'mainnet' && network !== 'kovan') { return null; }
  deployer.deploy(Dao, ContractResolver.address, { gas: 8000000, gasPrice: 30e9 })
    .then(() => {
      return deployer.deploy(DaoSpecialProposal, ContractResolver.address, { gas: 5000000 });
    })
    .then(() => {
      console.log('Deployed Interactive Part B');
    });
};
