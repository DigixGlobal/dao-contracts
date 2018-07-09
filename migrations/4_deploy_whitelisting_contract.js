const ContractResolver = artifacts.require('ContractResolver.sol');

const DaoInfoService = artifacts.require('DaoInfoService.sol');
const DaoListingService = artifacts.require('DaoListingService.sol');
const DaoCalculatorService = artifacts.require('DaoCalculatorService.sol');

const DaoStakeLocking = artifacts.require('DaoStakeLocking.sol');
const DaoIdentity = artifacts.require('DaoIdentity.sol');
const DaoFundingManager = artifacts.require('DaoFundingManager.sol');
const Dao = artifacts.require('Dao.sol');
const DaoVoting = artifacts.require('DaoVoting.sol');
const DaoVotingClaims = artifacts.require('DaoVotingClaims.sol');
const DaoRewardsManager = artifacts.require('DaoRewardsManager.sol');

const DaoWhitelisting = artifacts.require('DaoWhitelisting.sol');

module.exports = async function (deployer, network) {
  if ((network !== 'development') || process.env.SKIP) { return null; }
  deployer.deploy(DaoWhitelisting, ContractResolver.address, [
    DaoStakeLocking.address,
    DaoIdentity.address,
    DaoFundingManager.address,
    DaoRewardsManager.address,
    Dao.address,
    DaoVoting.address,
    DaoVotingClaims.address,
    DaoCalculatorService.address,
    DaoListingService.address,
    DaoInfoService.address,
  ])
    .then(() => {
      console.log('Deployed DaoWhitelisting');
    });
};
