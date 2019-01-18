const dotenv = require('dotenv');

const DaoUpgradeStorage = artifacts.require('./MockDaoUpgradeStorage.sol');
const MockDgd = artifacts.require('./MockDgd.sol');
const MockDgx = artifacts.require('./MockDgx.sol');

const ContractResolver = artifacts.require('./ContractResolver.sol');
const DoublyLinkedList = artifacts.require('./DoublyLinkedList.sol');

const DaoIdentityStorage = artifacts.require('./DaoIdentityStorage.sol');
const DaoConfigsStorage = artifacts.require('./MockDaoConfigsStorage.sol');
const DaoStakeStorage = artifacts.require('./DaoStakeStorage.sol');
const DaoPointsStorage = artifacts.require('./MockDaoPointsStorage.sol');
const DaoStorage = artifacts.require('./DaoStorage.sol');
const DaoSpecialStorage = artifacts.require('./DaoSpecialStorage.sol');
const DaoRewardsStorage = artifacts.require('./DaoRewardsStorage.sol');
const IntermediateResultsStorage = artifacts.require('./IntermediateResultsStorage.sol');
const MockDaoConfigsStorage = artifacts.require('./MockDaoConfigsStorage.sol');

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
  getAccountsAndAddressOf,
  printDaoDetails,
  phaseCorrection,
} = require('../test/setup');

const {
  getCurrentTimestamp,
} = require('@digix/helpers/lib/helpers');

const {
  daoConstantsKeys,
  phases,
} = require('../test/daoHelpers');

const bN = web3.toBigNumber;

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
  contracts.mockDaoConfigsStorage = await MockDaoConfigsStorage.deployed();

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
    const quarterDuration = await contracts.dao.getUintConfig.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);

    const currentQuarter = await contracts.dao.currentQuarterNumber.call();
    const currentTimestamp = getCurrentTimestamp();

    const newStartOfFirstQuarter = currentTimestamp - (quarterDuration.toNumber() * currentQuarter.toNumber()) - 1;
    console.log('\tSetting points for badgeHolders[0] ', addressOf.badgeHolders[0]);
    await contracts.daoPointsStorage.setQP(addressOf.badgeHolders[0], bN(1000), currentQuarter);

    console.log('\t ======= Current DAO details =======');
    await printDaoDetails(bN, contracts);
    console.log('\n### Teleporting to next quarter, Setting start of first quarter to ', newStartOfFirstQuarter);

    await contracts.daoUpgradeStorage.mock_set_start_of_quarter(bN(newStartOfFirstQuarter));
    contracts.dgxToken = await MockDgx.deployed();
    contracts.dgdToken = await MockDgd.deployed();
    console.log('\tAbout to transfered DGX to Dao');

    await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(1000 * (10 ** 9)));
    console.log('\tTransfered DGX to Dao');


    await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(100), { from: addressOf.founderBadgeHolder });
    await printDaoDetails(bN, contracts);
    console.log('\tcalculated global rewards');
    console.log('\tDGD balance of badgeHolders[0] = ', await contracts.dgdToken.balanceOf.call(addressOf.badgeHolders[0]));
    await contracts.daoStakeLocking.lockDGD(1e9, { from: addressOf.badgeHolders[0] });
    console.log('\tClaimableDGX of badgerHolders[0] = ', await contracts.daoRewardsStorage.claimableDGXs.call(addressOf.badgeHolders[0]));

    if (process.env.PHASE === 'locking_phase') {
      // set locking phase duration to FORCED_LOCKING_PHASE
      await contracts.mockDaoConfigsStorage.mock_set_uint_config('locking_phase_duration', parseInt(process.env.FORCED_LOCKING_PHASE, 10));
    } else if (process.env.PHASE === 'main_phase') {
      // wait for main phase to begin
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
    }
  });
};
