const a = require('awaiting');

const {
  indexRange,
  randomAddress,
  randomBigNumber,
  getCurrentTimestamp,
} = require('@digix/helpers/lib/helpers');

const {
} = require('./daoHelpers');

const {
  sampleStakeWeights,
  sampleBadgeWeights,
  daoConstantsKeys,
  phases,
  quarters,
  assertQuarter,
  getTimeToNextPhase,
  getPhase,
} = require('./daoHelpers');

const web3Utils = require('web3-utils');

const randomBigNumbers = function (bN, count, range) {
  return indexRange(0, count).map(() => randomBigNumber(bN, range));
};

const ContractResolver = process.env.SIMULATION ? 0 : artifacts.require('./ContractResolver.sol');
const DoublyLinkedList = process.env.SIMULATION ? 0 : artifacts.require('./DoublyLinkedList.sol');

const DaoIdentityStorage = process.env.SIMULATION ? 0 : artifacts.require('./DaoIdentityStorage.sol');
const DaoConfigsStorage = process.env.SIMULATION ? 0 : artifacts.require('./MockDaoConfigsStorage.sol');
const DaoStakeStorage = process.env.SIMULATION ? 0 : artifacts.require('./DaoStakeStorage.sol');
const DaoPointsStorage = process.env.SIMULATION ? 0 : artifacts.require('./DaoPointsStorage.sol');
const DaoStorage = process.env.SIMULATION ? 0 : artifacts.require('./DaoStorage.sol');
const DaoSpecialStorage = process.env.SIMULATION ? 0 : artifacts.require('./DaoSpecialStorage.sol');
const DaoFundingStorage = process.env.SIMULATION ? 0 : artifacts.require('./DaoFundingStorage.sol');
const DaoRewardsStorage = process.env.SIMULATION ? 0 : artifacts.require('./DaoRewardsStorage.sol');

const DaoInfoService = process.env.SIMULATION ? 0 : artifacts.require('./DaoInfoService.sol');
const DaoListingService = process.env.SIMULATION ? 0 : artifacts.require('./DaoListingService.sol');
const DaoCalculatorService = process.env.SIMULATION ? 0 : artifacts.require('./DaoCalculatorService.sol');

const DaoIdentity = process.env.SIMULATION ? 0 : artifacts.require('./DaoIdentity.sol');
const Dao = process.env.SIMULATION ? 0 : artifacts.require('./Dao.sol');
const DaoVoting = process.env.SIMULATION ? 0 : artifacts.require('./DaoVoting.sol');
const DaoVotingClaims = process.env.SIMULATION ? 0 : artifacts.require('./DaoVotingClaims.sol');
const DaoStakeLocking = process.env.SIMULATION ? 0 : artifacts.require('./DaoStakeLocking.sol');
const DaoFundingManager = process.env.SIMULATION ? 0 : artifacts.require('./DaoFundingManager.sol');
const DaoRewardsManager = process.env.SIMULATION ? 0 : artifacts.require('./DaoRewardsManager.sol');

const BADGE_HOLDER_COUNT = 4;
const DGD_HOLDER_COUNT = 6;

const deployLibraries = async function () {
  const libs = {};
  libs.doublyLinkedList = await DoublyLinkedList.new();
  return libs;
};

const deployNewContractResolver = async function (contracts) {
  contracts.resolver = await ContractResolver.new();
};

const getAccountsAndAddressOf = function (accounts) {
  const addressOf = {
    root: accounts[0],
    prl: accounts[1],
    kycadmin: accounts[2],
    founderBadgeHolder: accounts[3],
    badgeHolders: indexRange(4, 4 + BADGE_HOLDER_COUNT).map(id => accounts[id]), // accounts[4] to accounts[7]
    dgdHolders: indexRange(4 + BADGE_HOLDER_COUNT, 4 + BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(id => accounts[id]), // accounts[8] to accounts[13]
    allParticipants: indexRange(4, 4 + BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(id => accounts[id]), // accounts[4] to accounts[13]
  };
  return addressOf;
};

const getAllParticipantAddresses = function (accounts) {
  const addresses = [];
  for (const i of indexRange(3, 14)) {
    addresses.push(accounts[i]);
  }
  return addresses;
};

const deployStorage = async function (libs, contracts, resolver) {
  DaoIdentityStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.daoIdentityStorage = await DaoIdentityStorage.new(resolver.address);
  contracts.daoConfigsStorage = await DaoConfigsStorage.new(resolver.address);
  DaoStakeStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.daoStakeStorage = await DaoStakeStorage.new(resolver.address);
  contracts.daoPointsStorage = await DaoPointsStorage.new(resolver.address);
  DaoStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  DaoSpecialStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.daoStorage = await DaoStorage.new(resolver.address);
  contracts.daoSpecialStorage = await DaoSpecialStorage.new(resolver.address);
  contracts.daoFundingStorage = await DaoFundingStorage.new(resolver.address);
  contracts.daoRewardsStorage = await DaoRewardsStorage.new(resolver.address);
};

const registerInteractive = async function (resolver, addressOf) {
  const callingKeys = [
    'dao:identity',
    'dao:stake-locking',
    'c:dao',
    'dao:voting',
    'dao:voting:claims',
    // 'c:config:controller',
    'dao:funding-manager',
    'dao:rewards-manager',
  ];
  await a.map(callingKeys, 10, key => resolver.register_contract(key, addressOf.root));
};

const deployServices = async function (libs, contracts, resolver) {
  contracts.daoInfoService = await DaoInfoService.new(resolver.address);
  contracts.daoListingService = await DaoListingService.new(resolver.address);
  contracts.daoCalculatorService = await DaoCalculatorService.new(resolver.address, contracts.dgxDemurrageReporter.address);
};

const deployInteractive = async function (libs, contracts, resolver) {
  contracts.daoStakeLocking = await DaoStakeLocking.new(resolver.address, contracts.dgdToken.address, contracts.badgeToken.address);
  contracts.daoIdentity = await DaoIdentity.new(resolver.address);
  contracts.daoFundingManager = await DaoFundingManager.new(resolver.address);
  contracts.dao = await Dao.new(resolver.address);
  contracts.daoVoting = await DaoVoting.new(resolver.address);
  contracts.daoVotingClaims = await DaoVotingClaims.new(resolver.address);
  contracts.daoRewardsManager = await DaoRewardsManager.new(resolver.address, contracts.dgxToken.address);
};

const initialTransferTokens = async function (contracts, addressOf, bN) {
  await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (index) => {
    await contracts.dgdToken.transfer(addressOf.allParticipants[index], sampleStakeWeights(bN)[index]);
  });

  await a.map(indexRange(0, BADGE_HOLDER_COUNT), 20, async (index) => {
    await contracts.badgeToken.transfer(addressOf.badgeHolders[index], sampleBadgeWeights(bN)[index]);
  });
};

const getProposalStruct = function (bN, proposer, endorser, versions, generateRandom = false) {
  if (generateRandom) {
    versions = [];
    for (let i = 0; i < 3; i++) {
      versions.push({
        versionId: randomAddress,
        milestoneCount: 3,
        milestoneFundings: randomBigNumbers(bN, 3, 20),
        milestoneDurations: randomBigNumbers(bN, 3, 1000),
        finalReward: randomBigNumber(bN, 20),
      });
    }
  }
  return {
    id: versions[0].versionId,
    proposer,
    endorser,
    versions,
  };
};

const getTestProposals = function (bN, addressOf) {
  return [
    getProposalStruct(
      bN,
      addressOf.dgdHolders[0],
      addressOf.badgeHolders[0],
      [{
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(10 * (10 ** 18)), bN(15 * (10 ** 18)), bN(20 * (10 ** 18))],
        milestoneDurations: [bN(1000), bN(1500), bN(2000)],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(10 * (10 ** 18)), bN(20 * (10 ** 18)), bN(25 * (10 ** 18))],
        milestoneDurations: [bN(30), bN(30), bN(20)],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(10 * (10 ** 18)), bN(15 * (10 ** 18)), bN(15 * (10 ** 18)), bN(20 * (10 ** 18))],
        milestoneDurations: [bN(1000), bN(1500), bN(1500), bN(2000)],
        finalReward: bN(1 * (10 ** 18)),
      }],
    ),

    getProposalStruct(
      bN,
      addressOf.dgdHolders[1],
      addressOf.badgeHolders[1],
      [{
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
        milestoneDurations: [bN(500), bN(700), bN(300)],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
        milestoneDurations: [bN(20), bN(20), bN(20)],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
        milestoneDurations: [bN(500), bN(700), bN(300)],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
        milestoneDurations: [bN(500), bN(700), bN(300)],
        finalReward: bN(1 * (10 ** 18)),
      }],
    ),

    getProposalStruct(
      bN,
      addressOf.dgdHolders[4],
      addressOf.badgeHolders[2],
      [{
        versionId: randomAddress(),
        milestoneCount: 2,
        milestoneFundings: [bN(20 * (10 ** 18)), bN(30 * (10 ** 18))],
        milestoneDurations: [bN(2000), bN(3000)],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: randomAddress(),
        milestoneCount: 2,
        milestoneFundings: [bN(25 * (10 ** 18)), bN(25 * (10 ** 18))],
        milestoneDurations: [bN(10), bN(10)],
        finalReward: bN(1 * (10 ** 18)),
      }],
    ),

    getProposalStruct(
      bN,
      addressOf.dgdHolders[5],
      addressOf.badgeHolders[3],
      [{
        versionId: randomAddress(),
        milestoneCount: 4,
        milestoneFundings: [bN(1 * (10 ** 18)), bN(1 * (10 ** 18)), bN(2 * (10 ** 18)), bN(2 * (10 ** 18))],
        milestoneDurations: [bN(25), bN(25), bN(25), bN(25)],
        finalReward: bN(1 * (10 ** 18)),
      }],
    ),

  ];
};

const assignVotesAndCommits = function (addressOf, bN) {
  const salts = indexRange(0, 4).map(() => indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(() => randomBigNumber(bN)));
  // salts[proposalIndex][participantIndex] = salt

  const votes = indexRange(0, 4).map(() => indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(() => true));
  // votes[proposalIndex][holderIndex] = true/false

  const votingCommits = indexRange(0, 4).map(proposalIndex => indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(holderIndex => web3Utils.soliditySha3(
    { t: 'address', v: addressOf.allParticipants[holderIndex] },
    { t: 'bool', v: votes[proposalIndex][holderIndex] },
    { t: 'uint256', v: salts[proposalIndex][holderIndex] },
  )));
  // votingCommits[proposalIndex][holderIndex] contains the commit
  return { salts, votes, votingCommits };
};

const setDummyConfig = async function (contracts, bN) {
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION, bN(10));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_QUARTER_DURATION, bN(60));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTING_COMMIT_PHASE, bN(10));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTING_PHASE_TOTAL, bN(20));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_INTERIM_COMMIT_PHASE, bN(10));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL, bN(20));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE, bN(10));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL, bN(20));
};

const initDao = async function (contracts, addressOf, bN, web3) {
  await contracts.daoIdentity.addGroupUser(bN(2), addressOf.founderBadgeHolder, '', { from: addressOf.root });
  await contracts.daoIdentity.addGroupUser(bN(3), addressOf.prl, '', { from: addressOf.root });
  await contracts.daoIdentity.addGroupUser(bN(4), addressOf.kycadmin, '', { from: addressOf.root });
  await contracts.dao.setStartOfFirstQuarter(getCurrentTimestamp(), { from: addressOf.founderBadgeHolder });
  await web3.eth.sendTransaction({
    from: addressOf.root,
    to: contracts.daoFundingManager.address,
    value: web3.toWei(1000, 'ether'),
  });
};

const waitFor = async function (timeToWait, addressOf, web3) {
  const timeThen = getCurrentTimestamp();
  async function wait() {
    await web3.eth.sendTransaction({ from: addressOf.root, to: addressOf.prl, value: web3.toWei(0.0001, 'ether') });
    if ((getCurrentTimestamp() - timeThen) > timeToWait) return;
    await wait();
  }
  await wait();
};

/**
 * Wait for time to pass, end in the phaseToEndIn phase
 * @param phaseToEndIn   : The phase in which to land (phases.LOCKING_PHASE or phases.MAIN_PHASE)
 * @param quarterToEndIn : The quarter in which to land (quarter.QUARTER_1 or phases.QUARTER_2)
 */
const phaseCorrection = async function (contracts, addressOf, phaseToEndIn, quarterToEndIn, web3) {
  const startOfDao = await contracts.daoStorage.startOfFirstQuarter.call();
  const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
  const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
  const currentPhase = getPhase(
    getCurrentTimestamp(),
    startOfDao.toNumber(),
    lockingPhaseDuration.toNumber(),
    quarterDuration.toNumber(),
  );
  if (currentPhase !== phaseToEndIn) {
    const timeToNextPhase = getTimeToNextPhase(
      getCurrentTimestamp(),
      startOfDao.toNumber(),
      lockingPhaseDuration.toNumber(),
      quarterDuration.toNumber(),
    );
    console.log('\t\twaiting for next phase...');
    await waitFor(timeToNextPhase, addressOf, web3);
    if (quarterToEndIn !== undefined) {
      assertQuarter(
        getCurrentTimestamp(),
        startOfDao.toNumber(),
        lockingPhaseDuration.toNumber(),
        quarterDuration.toNumber(),
        quarterToEndIn,
      );
    }
  }
};

const waitForRevealPhase = async function (contracts, addressOf, proposalId, index, bN, web3) {
  const votingStartTime = await contracts.daoStorage.readProposalVotingTime.call(proposalId, index);
  let timeToWaitFor;
  if (index === bN(0)) {
    timeToWaitFor = (await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTING_COMMIT_PHASE)).toNumber() - (getCurrentTimestamp() - votingStartTime.toNumber());
  } else {
    timeToWaitFor = (await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_COMMIT_PHASE)).toNumber() - (getCurrentTimestamp() - votingStartTime.toNumber());
  }
  console.log('will wait for ', timeToWaitFor, ' seconds');
  await waitFor(timeToWaitFor, addressOf, web3);
};

const waitForRevealPhaseToGetOver = async function (contracts, addressOf, proposalId, index, bN, web3) {
  const votingStartTime = await contracts.daoStorage.readProposalVotingTime.call(proposalId, index);
  let timeToWaitFor;
  if (index === bN(0)) {
    timeToWaitFor = (await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTING_PHASE_TOTAL)).toNumber() - (getCurrentTimestamp() - votingStartTime.toNumber());
  } else {
    timeToWaitFor = (await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL)).toNumber() - (getCurrentTimestamp() - votingStartTime.toNumber());
  }
  console.log('will wait for ', timeToWaitFor, ' seconds');
  await waitFor(timeToWaitFor, addressOf, web3);
};

module.exports = {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  getAllParticipantAddresses,
  deployStorage,
  registerInteractive,
  deployServices,
  deployInteractive,
  initialTransferTokens,
  waitFor,
  waitForRevealPhase,
  waitForRevealPhaseToGetOver,
  getTestProposals,
  phaseCorrection,
  initDao,
  assignVotesAndCommits,
  setDummyConfig,
  BADGE_HOLDER_COUNT,
  DGD_HOLDER_COUNT,
};
