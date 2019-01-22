const ContractResolver = artifacts.require('ContractResolver.sol');

const DaoListingService = artifacts.require('DaoListingService.sol');
const DaoCalculatorService = artifacts.require('DaoCalculatorService.sol');

const DaoStakeLocking = artifacts.require('DaoStakeLocking.sol');
const DaoIdentity = artifacts.require('DaoIdentity.sol');
const DaoFundingManager = artifacts.require('DaoFundingManager.sol');
const Dao = artifacts.require('Dao.sol');
const DaoSpecialProposal = artifacts.require('DaoSpecialProposal.sol');
const DaoVoting = artifacts.require('DaoVoting.sol');
const DaoVotingClaims = artifacts.require('DaoVotingClaims.sol');
const DaoSpecialVotingClaims = artifacts.require('DaoSpecialVotingClaims.sol');
const DaoRewardsManager = artifacts.require('DaoRewardsManager.sol');
const DaoRewardsManagerExtras = artifacts.require('DaoRewardsManagerExtras.sol');

const DaoWhitelisting = artifacts.require('DaoWhitelisting.sol');

module.exports = async (deployer, network) => {
  if (network !== 'mainnet') { return null; }
  deployer.deploy(DaoWhitelisting, ContractResolver.address, [
    DaoCalculatorService.address,
    DaoListingService.address,
    DaoStakeLocking.address,
    DaoIdentity.address,
    DaoFundingManager.address,
    Dao.address,
    DaoSpecialProposal.address,
    DaoVoting.address,
    DaoVotingClaims.address,
    DaoSpecialVotingClaims.address,
    DaoRewardsManager.address,
    DaoRewardsManagerExtras.address,
  ])
    .then(() => {
      console.log('Deployed Interactive Part E');
    });
};
