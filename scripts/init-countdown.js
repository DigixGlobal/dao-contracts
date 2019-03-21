const ContractResolver = artifacts.require('./ContractResolver.sol');
const DoublyLinkedList = artifacts.require('./DoublyLinkedList.sol');

const DaoIdentityStorage = artifacts.require('./DaoIdentityStorage.sol');
const DaoConfigsStorage = artifacts.require('./MockDaoConfigsStorage.sol');
const DaoStakeStorage = artifacts.require('./DaoStakeStorage.sol');
const DaoPointsStorage = artifacts.require('./MockDaoPointsStorage.sol');
const DaoStorage = artifacts.require('./DaoStorage.sol');
const DaoUpgradeStorage = artifacts.require('./MockDaoUpgradeStorage.sol');
const DaoSpecialStorage = artifacts.require('./DaoSpecialStorage.sol');
const DaoRewardsStorage = artifacts.require('./DaoRewardsStorage.sol');
const IntermediateResultsStorage = artifacts.require('./IntermediateResultsStorage.sol');

const DaoListingService = artifacts.require('./DaoListingService.sol');
const DaoCalculatorService = artifacts.require('./DaoCalculatorService.sol');

const DaoIdentity = artifacts.require('./DaoIdentity.sol');
const Dao = artifacts.require('./Dao.sol');
const DaoSpecialProposal = artifacts.require('./DaoSpecialProposal.sol');
const DaoVoting = artifacts.require('./DaoVoting.sol');
const DaoVotingClaims = artifacts.require('./DaoVotingClaims.sol');
const DaoSpecialVotingClaims = artifacts.require('./DaoSpecialVotingClaims.sol');
const DaoStakeLocking = artifacts.require('./DaoStakeLocking.sol');
const DaoFundingManager = artifacts.require('./DaoFundingManager.sol');
const DaoRewardsManager = artifacts.require('./DaoRewardsManager.sol');

const {
  getCurrentTimestamp,
} = require('@digix/helpers/lib/helpers');

const {
  getAccountsAndAddressOf,
} = require('../test/setup');

const dotenv = require('dotenv');

const bN = web3.toBigNumber;

// Initialise DigixDAO
// This function adds members (PRL, Founder and KYC Admin) to their respective groups
// This function sends some Ethers into the DaoFundingManager contract
// This function sets the start of the first quarter (marking the start of DigixDAO)
const initDao = async function (contracts, addressOf, bN) {
  await contracts.daoIdentity.addGroupUser(bN(2), addressOf.founderBadgeHolder, '', { from: addressOf.root });
  await contracts.daoIdentity.addGroupUser(bN(3), addressOf.prl, '', { from: addressOf.root });
  await contracts.daoIdentity.addGroupUser(bN(4), addressOf.kycadmin, '', { from: addressOf.root });
  const startIn = parseInt(process.env.START_IN, 10);
  await contracts.dao.setStartOfFirstQuarter(bN(startIn + getCurrentTimestamp()), { from: addressOf.founderBadgeHolder });
};

const assignDeployedContracts = async function (contracts, libs) {
  contracts.resolver = await ContractResolver.deployed();
  libs.doublyLinkedList = await DoublyLinkedList.deployed();

  contracts.daoIdentityStorage = await DaoIdentityStorage.deployed();
  contracts.daoConfigsStorage = await DaoConfigsStorage.deployed();
  contracts.daoStakeStorage = await DaoStakeStorage.deployed();
  contracts.daoPointsStorage = await DaoPointsStorage.deployed();
  contracts.daoStorage = await DaoStorage.deployed();
  contracts.daoUpgradeStorage = await DaoUpgradeStorage.deployed();
  contracts.daoSpecialStorage = await DaoSpecialStorage.deployed();
  contracts.daoRewardsStorage = await DaoRewardsStorage.deployed();
  contracts.intermediateResultsStorage = await IntermediateResultsStorage.deployed();

  contracts.daoListingService = await DaoListingService.deployed();
  contracts.daoCalculatorService = await DaoCalculatorService.deployed();

  contracts.daoStakeLocking = await DaoStakeLocking.deployed();
  contracts.daoIdentity = await DaoIdentity.deployed();
  contracts.daoFundingManager = await DaoFundingManager.deployed();
  contracts.dao = await Dao.deployed();
  contracts.daoSpecialProposal = await DaoSpecialProposal.deployed();
  contracts.daoVoting = await DaoVoting.deployed();
  contracts.daoVotingClaims = await DaoVotingClaims.deployed();
  contracts.daoSpecialVotingClaims = await DaoSpecialVotingClaims.deployed();
  contracts.daoRewardsManager = await DaoRewardsManager.deployed();
};

module.exports = async function () {
  const addressOf = {};
  const contracts = {};
  const libs = {};
  dotenv.config();
  await web3.eth.getAccounts(async function (e, accounts) {
    getAccountsAndAddressOf(accounts, addressOf);

    await assignDeployedContracts(contracts, libs);
    console.log('got the deployed contracts');

    // start dao and fund dao
    await initDao(contracts, addressOf, bN);
  });
};
