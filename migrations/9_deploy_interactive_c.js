const ContractResolver = artifacts.require('ContractResolver.sol');

const DaoVoting = artifacts.require('DaoVoting.sol');
const DaoVotingClaims = artifacts.require('DaoVotingClaims.sol');
const DaoSpecialVotingClaims = artifacts.require('DaoSpecialVotingClaims.sol');

module.exports = async (deployer, network) => {
  if (network !== 'mainnet') { return null; }
  deployer.deploy(DaoVoting, ContractResolver.address)
    .then(() => {
      return deployer.deploy(DaoSpecialVotingClaims, ContractResolver.address);
    })
    .then(() => {
      return deployer.deploy(DaoVotingClaims, ContractResolver.address);
    })
    .then(() => {
      console.log('Deployed Interactive Part C');
    });
};
