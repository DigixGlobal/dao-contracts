const DGDToken = artifacts.require('./MockDGD.sol');
const DGDBadgeToken = artifacts.require('./MockBadge.sol');
const MockDgx = artifacts.require('./MockDgx.sol');
const MockDgxDemurrageReporter = artifacts.require('./MockDgxDemurrageReporter.sol');

const ContractResolver = artifacts.require('ContractResolver.sol');
const DoublyLinkedList = artifacts.require('DoublyLinkedList.sol');

const DaoIdentityStorage = artifacts.require('DaoIdentityStorage.sol');
const DaoConfigsStorage = artifacts.require('MockDaoConfigsStorage.sol');
const DaoStakeStorage = artifacts.require('DaoStakeStorage.sol');
const DaoPointsStorage = artifacts.require('DaoPointsStorage.sol');
const DaoStorage = artifacts.require('DaoStorage.sol');
const DaoSpecialStorage = artifacts.require('DaoSpecialStorage.sol');
const DaoFundingStorage = artifacts.require('DaoFundingStorage.sol');
const DaoRewardsStorage = artifacts.require('DaoRewardsStorage.sol');

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

module.exports = async function (deployer, network) {
  if ((network !== 'development') || process.env.SKIP) { return null; }
  deployer.deploy(ContractResolver)
    .then(() => {
      return deployer.deploy(DoublyLinkedList);
    })
    .then(() => {
      deployer.link(DoublyLinkedList, DaoIdentityStorage);
      deployer.link(DoublyLinkedList, DaoStakeStorage);
      deployer.link(DoublyLinkedList, DaoStorage);
      return deployer.link(DoublyLinkedList, DaoSpecialStorage);
    })
    .then(() => {
      deployer.deploy(DaoIdentityStorage, ContractResolver.address);
      deployer.deploy(DaoConfigsStorage, ContractResolver.address);
      deployer.deploy(DaoStakeStorage, ContractResolver.address);
      deployer.deploy(DaoPointsStorage, ContractResolver.address);
      deployer.deploy(DaoStorage, ContractResolver.address);
      deployer.deploy(DaoSpecialStorage, ContractResolver.address);
      deployer.deploy(DaoFundingStorage, ContractResolver.address);
      return deployer.deploy(DaoRewardsStorage, ContractResolver.address);
    })
    .then(() => {
      deployer.deploy(DaoInfoService, ContractResolver.address);
      deployer.deploy(DaoListingService, ContractResolver.address);
      return deployer.deploy(DaoCalculatorService, ContractResolver.address, MockDgxDemurrageReporter.address);
    })
    .then(() => {
      deployer.deploy(DaoStakeLocking, ContractResolver.address, DGDToken.address, DGDBadgeToken.address);
      deployer.deploy(DaoIdentity, ContractResolver.address);
      deployer.deploy(DaoFundingManager, ContractResolver.address);
      deployer.deploy(Dao, ContractResolver.address);
      deployer.deploy(DaoVoting, ContractResolver.address);
      deployer.deploy(DaoVotingClaims, ContractResolver.address);
      return deployer.deploy(DaoRewardsManager, ContractResolver.address, MockDgx.address);
    })
    .then(() => {
      console.log('Deployment Completed');
    });
};
