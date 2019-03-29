const ContractResolver = artifacts.require('ContractResolver.sol');

const DaoVoting = artifacts.require('DaoVoting.sol');
const DaoVotingClaims = artifacts.require('DaoVotingClaims.sol');
const DaoSpecialVotingClaims = artifacts.require('DaoSpecialVotingClaims.sol');

module.exports = async (deployer, network) => {
  if (network !== 'mainnet' && network !== 'kovan') { return null; }
  deployer.deploy(DaoVoting, ContractResolver.address, { gas: 6000000 })
    .then(() => {
      return deployer.deploy(DaoSpecialVotingClaims, ContractResolver.address, { gas: 5000000 });
    })
    .then(() => {
      return deployer.deploy(DaoVotingClaims, ContractResolver.address, { gas: 8000000, gasPrice: 30e9 });
    })
    .then(() => {
      console.log('Deployed Interactive Part C');
    });
};
