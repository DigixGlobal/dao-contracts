const DGDToken = artifacts.require('./MockDgd.sol');
const DGDBadgeToken = artifacts.require('./MockBadge.sol');
const MockDgx = artifacts.require('./MockDgx.sol');
const MockDgxDemurrageReporter = artifacts.require('./MockDgxDemurrageReporter.sol');
const MockNumberCarbonVoting1 = artifacts.require('./NumberCarbonVoting1.sol');
const MockNumberCarbonVoting2 = artifacts.require('./NumberCarbonVoting2.sol');

const ContractResolver = artifacts.require('ContractResolver.sol');
const DoublyLinkedList = artifacts.require('DoublyLinkedList.sol');
const DaoStructs = artifacts.require('DaoStructs.sol');

const DaoIdentityStorage = artifacts.require('DaoIdentityStorage.sol');
const DaoConfigsStorage = artifacts.require('MockDaoConfigsStorage.sol');
const DaoStakeStorage = artifacts.require('DaoStakeStorage.sol');
const DaoPointsStorage = artifacts.require('DaoPointsStorage.sol');
const DaoStorage = artifacts.require('DaoStorage.sol');
const DaoProposalCounterStorage = artifacts.require('DaoProposalCounterStorage.sol');
const DaoUpgradeStorage = artifacts.require('DaoUpgradeStorage.sol');
const DaoSpecialStorage = artifacts.require('DaoSpecialStorage.sol');
const DaoRewardsStorage = artifacts.require('DaoRewardsStorage.sol');
const DaoWhitelistingStorage = artifacts.require('DaoWhitelistingStorage.sol');
const IntermediateResultsStorage = artifacts.require('IntermediateResultsStorage.sol');

const DaoListingService = artifacts.require('DaoListingService.sol');
const DaoCalculatorService = artifacts.require('DaoCalculatorService.sol');

const DaoStakeLocking = artifacts.require('DaoStakeLocking.sol');
const DaoIdentity = artifacts.require('DaoIdentity.sol');
const DaoInformation = artifacts.require('DaoInformation.sol');
const DaoFundingManager = artifacts.require('DaoFundingManager.sol');
const Dao = artifacts.require('Dao.sol');
const DaoSpecialProposal = artifacts.require('DaoSpecialProposal.sol');
const DaoVoting = artifacts.require('DaoVoting.sol');
const DaoVotingClaims = artifacts.require('DaoVotingClaims.sol');
const DaoSpecialVotingClaims = artifacts.require('DaoSpecialVotingClaims.sol');
const DaoRewardsManager = artifacts.require('DaoRewardsManager.sol');
const DaoRewardsManagerExtras = artifacts.require('DaoRewardsManagerExtras.sol');

module.exports = async function (deployer, network, accounts) {
  if ((network !== 'development' && network !== 'kovan') || process.env.SKIP) { return null; }
  deployer.deploy(ContractResolver)
    .then(() => {
      return deployer.deploy(DoublyLinkedList);
    })
    .then(() => {
      return deployer.link(DoublyLinkedList, DaoStructs);
    })
    .then(() => {
      return deployer.deploy(DaoStructs);
    })
    .then(() => {
      deployer.link(DoublyLinkedList, DaoIdentityStorage);
      deployer.link(DoublyLinkedList, DaoStakeStorage);
      deployer.link(DoublyLinkedList, DaoStorage);
      deployer.link(DaoStructs, DaoStorage);
      deployer.link(DaoStructs, DaoSpecialStorage);
      return deployer.link(DoublyLinkedList, DaoSpecialStorage);
    })
    .then(() => {
      deployer.deploy(DaoIdentityStorage, ContractResolver.address);
      deployer.deploy(DaoConfigsStorage, ContractResolver.address);
      deployer.deploy(DaoStakeStorage, ContractResolver.address);
      deployer.deploy(DaoPointsStorage, ContractResolver.address);
      deployer.deploy(DaoStorage, ContractResolver.address);
      deployer.deploy(DaoProposalCounterStorage, ContractResolver.address);
      deployer.deploy(DaoUpgradeStorage, ContractResolver.address);
      deployer.deploy(DaoSpecialStorage, ContractResolver.address);
      deployer.deploy(DaoWhitelistingStorage, ContractResolver.address);
      deployer.deploy(IntermediateResultsStorage, ContractResolver.address);
      return deployer.deploy(DaoRewardsStorage, ContractResolver.address);
    })
    .then(() => {
      deployer.deploy(DaoListingService, ContractResolver.address);
      return deployer.deploy(DaoCalculatorService, ContractResolver.address, MockDgxDemurrageReporter.address);
    })
    .then(() => {
      deployer.deploy(
        DaoStakeLocking,
        ContractResolver.address,
        DGDToken.address,
        DGDBadgeToken.address,
        MockNumberCarbonVoting1.address,
        MockNumberCarbonVoting2.address,
      );
      deployer.deploy(DaoIdentity, ContractResolver.address);
      deployer.deploy(DaoInformation, ContractResolver.address);
      deployer.deploy(DaoFundingManager, ContractResolver.address, accounts[0]);
      deployer.deploy(DaoVoting, ContractResolver.address);
      deployer.deploy(Dao, ContractResolver.address);
      deployer.deploy(DaoSpecialProposal, ContractResolver.address);
      deployer.deploy(DaoVotingClaims, ContractResolver.address);
      deployer.deploy(DaoRewardsManager, ContractResolver.address, MockDgx.address);
      deployer.deploy(DaoRewardsManagerExtras, ContractResolver.address);
      return deployer.deploy(DaoSpecialVotingClaims, ContractResolver.address);
    })
    .then(() => {
      console.log('Deployment Completed');
    });
};
