const a = require('awaiting');
const assert = require('assert');
const web3Utils = require('web3-utils');

const MockDGD = artifacts.require('./MockDGD.sol');
const MockBadge = artifacts.require('./MockBadge.sol');
const MockDgxStorage = artifacts.require('./MockDgxStorage.sol');
const MockDgx = artifacts.require('./MockDgx.sol');
const MockDgxDemurrageReporter = artifacts.require('./MockDgxDemurrageReporter.sol');

const ContractResolver = artifacts.require('./ContractResolver.sol');
const DoublyLinkedList = artifacts.require('./DoublyLinkedList.sol');

const IdentityStorage = artifacts.require('./IdentityStorage.sol');
const DaoConfigsStorage = artifacts.require('./MockDaoConfigsStorage.sol');
const DaoStakeStorage = artifacts.require('./DaoStakeStorage.sol');
const DaoPointsStorage = artifacts.require('./DaoPointsStorage.sol');
const DaoStorage = artifacts.require('./DaoStorage.sol');
const DaoSpecialStorage = artifacts.require('./DaoSpecialStorage.sol');
const DaoFundingStorage = artifacts.require('./DaoFundingStorage.sol');
const DaoRewardsStorage = artifacts.require('./DaoRewardsStorage.sol');

const DaoInfoService = artifacts.require('./DaoInfoService.sol');
const DaoListingService = artifacts.require('./DaoListingService.sol');
const DaoCalculatorService = artifacts.require('./DaoCalculatorService.sol');

const DaoIdentity = artifacts.require('./DaoIdentity.sol');
const Dao = artifacts.require('./Dao.sol');
const DaoVoting = artifacts.require('./DaoVoting.sol');
const DaoVotingClaims = artifacts.require('./DaoVotingClaims.sol');
const DaoStakeLocking = artifacts.require('./DaoStakeLocking.sol');
const DaoFundingManager = artifacts.require('./DaoFundingManager.sol');
const QuarterPoint = artifacts.require('./QuarterPoint.sol');
const ReputationPoint = artifacts.require('./ReputationPoint.sol');
const DaoRewardsManager = artifacts.require('./DaoRewardsManager.sol');

/*
 *  ---------------------- SIMULATION CONFIGURATION ----------------------------
 *
 *               --------------- QUARTER 1 ----------------
 *                      ------ LOCKING PHASE ------
 *  ADDRESS                       DGD TOKENS                  DGD BADGE
 *  addressOf.badgeHolder1        10 * (10 ** 9)              5
 *  addressOf.badgeHolder2        30 * (10 ** 9)              12
 *  addressOf.badgeHolder3        40 * (10 ** 9)              15
 *  addressOf.badgeHolder4        20 * (10 ** 9)              18
 *  addressOf.dgdHolder1          10 * (10 ** 9)              0
 *  addressOf.dgdHolder2          15 * (10 ** 9)              0
 *  addressOf.dgdHolder3          0  * (10 ** 9)              0
 *  addressOf.dgdHolder4          0  * (10 ** 9)              0
 *  addressOf.dgdHolder5          5  * (10 ** 9)              0
 *  addressOf.dgdHolder6          30 * (10 ** 9)              0
 *
 *                      -------- MAIN PHASE -------
 *  ADDRESS                       CONFIG (proposalIds, proposers, ...
 *                                        moreVersions, milestoneDurations, ...
 *                                        milestoneFundings, endorsers)
 *  addressOf.proposer1           firstProposal
 *  addressOf.proposer2           secondProposal
 *  addressOf.proposer3           thirdProposal
 *  addressOf.proposer4           fourthProposal
 *
 *                      -------- DRAFT VOTING --------
 *  PROPOSAL                      ADDRESS                     DRAFT_VOTES
 *  firstProposal                 addressof.badgeHolder1      yes
 *  firstProposal                 addressof.badgeHolder2      yes
 *  firstProposal                 addressof.badgeHolder3      yes
 *  firstProposal                 addressof.badgeHolder4      yes
 *                      ---------------------------
 *  secondProposal                addressof.badgeHolder1      no
 *  secondProposal                addressof.badgeHolder2      no
 *  secondProposal                addressof.badgeHolder3      no
 *  secondProposal                addressof.badgeHolder4      no
 *                      ---------------------------
 *  thirdProposal                 addressof.badgeHolder1      yes
 *  thirdProposal                 addressof.badgeHolder2      no
 *  thirdProposal                 addressof.badgeHolder3      yes
 *  thirdProposal                 addressof.badgeHolder4      yes
 *                      ---------------------------
 *  fourthProposal                addressof.badgeHolder1      no
 *  fourthProposal                addressof.badgeHolder2      yes
 *  fourthProposal                addressof.badgeHolder3      yes
 *  fourthProposal                addressof.badgeHolder4      yes
 *
 *                   ----- LOCK MORE DGDs (MAIN PHASE) -----
 *  ADDRESS                       DGD TOKENS
 *  addressOf.badgeHolder1        10 * (10 ** 9)
 *  addressOf.badgeHolder2        20 * (10 ** 9)
 *  addressOf.badgeHolder3        20 * (10 ** 9)
 *  addressOf.badgeHolder4        55 * (10 ** 9)
 *  addressOf.dgdHolder1          6 * (10 ** 9)
 *  addressOf.dgdHolder2          15 * (10 ** 9)
 *  addressOf.dgdHolder3          10 * (10 ** 9)
 *  addressOf.dgdHolder4          12 * (10 ** 9)
 *  addressOf.dgdHolder5          5 * (10 ** 9)
 *  addressOf.dgdHolder6          10 * (10 ** 9)
 *
 *                     ------ VOTING ON PROPOSALS ------
 *  PROPOSAL                      ADDRESS                     DRAFT_VOTES
 *  firstProposal                 addressof.badgeHolder1      yes
 *  firstProposal                 addressof.badgeHolder2      yes
 *  firstProposal                 addressof.badgeHolder3      yes
 *  firstProposal                 addressof.badgeHolder4      yes
 *  firstProposal                 addressof.dgdHolder1        yes
 *  firstProposal                 addressof.dgdHolder2        yes
 *  firstProposal                 addressof.dgdHolder3        yes
 *  firstProposal                 addressof.dgdHolder4        yes
 *  firstProposal                 addressof.dgdHolder5        yes
 *  firstProposal                 addressof.dgdHolder6        yes
 */

const {
  getAccountsAndAddressOf,
  // assignDeployedContracts,
  // deployNewContractResolver,
  // deployLibraries,
  // deployStorage,
  // deployServices,
  // deployInteractive,
  initialTransferTokens,
  proposalIds,
  proposers,
  endorsers,
  moreVersions,
  milestoneDurations,
  milestoneFundings,
  lastNonces,
  finalRewards,
} = require('./setup');

const {
  daoConstantsKeys,
  daoConstantsValues,
  phases,
  quarters,
  assertQuarter,
  getTimeToNextPhase,
  getPhase,
} = require('./daoHelpers');

const {
  getCurrentTimestamp,
  randomBigNumber,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

const dotenv = require('dotenv');

const setupMockTokens = async function (contracts, addressOf) {
  dotenv.config();
  contracts.dgdToken = await MockDGD.deployed();
  contracts.badgeToken = await MockBadge.deployed();
  contracts.dgxStorage = await MockDgxStorage.deployed();
  contracts.dgxToken = await MockDgx.deployed();
  await contracts.dgxStorage.setInteractive(contracts.dgxToken.address);
  contracts.demurrageReporter = await MockDgxDemurrageReporter.deployed();
  if (process.env.FIRST_TEST) {
    console.log('transferring initial tokens');
    await initialTransferTokens(contracts, addressOf, bN);
  }
};

const assignDeployedContracts = async function (contracts, libs) {
  contracts.resolver = await ContractResolver.deployed();
  libs.doublyLinkedList = await DoublyLinkedList.deployed();

  contracts.identityStorage = await IdentityStorage.deployed();
  contracts.daoConfigsStorage = await DaoConfigsStorage.deployed();
  contracts.daoStakeStorage = await DaoStakeStorage.deployed();
  contracts.daoPointsStorage = await DaoPointsStorage.deployed();
  contracts.daoStorage = await DaoStorage.deployed();
  contracts.daoSpecialStorage = await DaoSpecialStorage.deployed();
  contracts.daoFundingStorage = await DaoFundingStorage.deployed();
  contracts.daoRewardsStorage = await DaoRewardsStorage.deployed();

  contracts.daoInfoService = await DaoInfoService.deployed();
  contracts.daoListingService = await DaoListingService.deployed();
  contracts.daoCalculatorService = await DaoCalculatorService.deployed();

  contracts.daoStakeLocking = await DaoStakeLocking.deployed();
  contracts.daoIdentity = await DaoIdentity.deployed();
  contracts.daoFundingManager = await DaoFundingManager.deployed();
  contracts.dao = await Dao.deployed();
  contracts.daoVoting = await DaoVoting.deployed();
  contracts.daoVotingClaims = await DaoVotingClaims.deployed();
  contracts.daoQuarterPoint = await QuarterPoint.deployed();
  contracts.daoReputationPoint = await ReputationPoint.deployed();
  contracts.daoRewardsManager = await DaoRewardsManager.deployed();
};

const setDummyConfig = async function (contracts) {
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION, bN(10));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_QUARTER_DURATION, bN(60));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTING_COMMIT_PHASE, bN(10));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTING_PHASE_TOTAL, bN(20));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_INTERIM_COMMIT_PHASE, bN(10));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL, bN(20));
};

const initDao = async function (contracts, addressOf) {
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

const waitFor = async function (timeToWait, addressOf) {
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
const phaseCorrection = async function (contracts, addressOf, phaseToEndIn, quarterToEndIn) {
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
    await waitFor(timeToNextPhase, addressOf);
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

const waitForRevealPhase = async function (contracts, addressOf, proposalId, index) {
  const votingStartTime = await contracts.daoStorage.readProposalVotingTime.call(proposalId, index);
  let timeToWaitFor;
  if (index === bN(0)) {
    timeToWaitFor = (await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTING_COMMIT_PHASE)).toNumber() - (getCurrentTimestamp() - votingStartTime.toNumber());
  } else {
    timeToWaitFor = (await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_COMMIT_PHASE)).toNumber() - (getCurrentTimestamp() - votingStartTime.toNumber());
  }
  console.log('will wait for ', timeToWaitFor, ' seconds');
  await waitFor(timeToWaitFor, addressOf);
};

const waitForRevealPhaseToGetOver = async function (contracts, addressOf, proposalId, index) {
  const votingStartTime = await contracts.daoStorage.readProposalVotingTime.call(proposalId, index);
  let timeToWaitFor;
  if (index === bN(0)) {
    timeToWaitFor = (await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTING_PHASE_TOTAL)).toNumber() - (getCurrentTimestamp() - votingStartTime.toNumber());
  } else {
    timeToWaitFor = (await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL)).toNumber() - (getCurrentTimestamp() - votingStartTime.toNumber());
  }
  console.log('will wait for ', timeToWaitFor, ' seconds');
  await waitFor(timeToWaitFor, addressOf);
};

const approveTokens = async function (contracts, addressOf) {
  await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(20 * (10 ** 9)), { from: addressOf.badgeHolder1 });
  await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(5), { from: addressOf.badgeHolder1 });
  await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(50 * (10 ** 9)), { from: addressOf.badgeHolder2 });
  await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(12), { from: addressOf.badgeHolder2 });
  await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(60 * (10 ** 9)), { from: addressOf.badgeHolder3 });
  await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(15), { from: addressOf.badgeHolder3 });
  await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(75 * (10 ** 9)), { from: addressOf.badgeHolder4 });
  await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(18), { from: addressOf.badgeHolder4 });
  await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(16 * (10 ** 9)), { from: addressOf.dgdHolder1 });
  await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(30 * (10 ** 9)), { from: addressOf.dgdHolder2 });
  await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: addressOf.dgdHolder3 });
  await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(12 * (10 ** 9)), { from: addressOf.dgdHolder4 });
  await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: addressOf.dgdHolder5 });
  await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(40 * (10 ** 9)), { from: addressOf.dgdHolder6 });
};

const lockStakeAndBadges = async function (contracts, addressOf, phase) {
  if (phase === phases.LOCKING_PHASE) {
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockBadge(bN(5), { from: addressOf.badgeHolder1 });
    await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.badgeHolder1 });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockBadge(bN(12), { from: addressOf.badgeHolder2 });
    await contracts.daoStakeLocking.lockDGD(bN(30 * (10 ** 9)), { from: addressOf.badgeHolder2 });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockBadge(bN(15), { from: addressOf.badgeHolder3 });
    await contracts.daoStakeLocking.lockDGD(bN(40 * (10 ** 9)), { from: addressOf.badgeHolder3 });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockBadge(bN(18), { from: addressOf.badgeHolder4 });
    await contracts.daoStakeLocking.lockDGD(bN(20 * (10 ** 9)), { from: addressOf.badgeHolder4 });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.dgdHolder1 });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(15 * (10 ** 9)), { from: addressOf.dgdHolder2 });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(5 * (10 ** 9)), { from: addressOf.dgdHolder5 });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(30 * (10 ** 9)), { from: addressOf.dgdHolder6 });
  }

  if (phase === phases.MAIN_PHASE) {
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(6 * (10 ** 9)), { from: addressOf.dgdHolder1 });
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(15 * (10 ** 9)), { from: addressOf.dgdHolder2 });
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.dgdHolder3 });
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(12 * (10 ** 9)), { from: addressOf.dgdHolder4 });
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(5 * (10 ** 9)), { from: addressOf.dgdHolder5 });
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.dgdHolder6 });
  }
};

const kycProposers = async function (contracts, addressOf) {
  const expiry = getCurrentTimestamp() + 2628000; // KYC valid for 1 month
  await contracts.daoIdentity.updateKyc(proposers(addressOf).firstProposal, '', expiry, { from: addressOf.kycadmin });
  await contracts.daoIdentity.updateKyc(proposers(addressOf).secondProposal, '', expiry, { from: addressOf.kycadmin });
  await contracts.daoIdentity.updateKyc(proposers(addressOf).thirdProposal, '', expiry, { from: addressOf.kycadmin });
  await contracts.daoIdentity.updateKyc(proposers(addressOf).fourthProposal, '', expiry, { from: addressOf.kycadmin });
};

const addAndEndorseProposals = async function (contracts, addressOf) {
  await contracts.dao.submitPreproposal(
    proposalIds.firstProposal,
    milestoneDurations(bN).firstProposal.versionOne,
    milestoneFundings(bN).firstProposal.versionOne,
    finalRewards(bN).firstProposal,
    { from: proposers(addressOf).firstProposal },
  );
  await contracts.dao.submitPreproposal(
    proposalIds.secondProposal,
    milestoneDurations(bN).secondProposal.versionOne,
    milestoneFundings(bN).secondProposal.versionOne,
    finalRewards(bN).secondProposal,
    { from: proposers(addressOf).secondProposal },
  );
  await contracts.dao.submitPreproposal(
    proposalIds.thirdProposal,
    milestoneDurations(bN).thirdProposal.versionOne,
    milestoneFundings(bN).thirdProposal.versionOne,
    finalRewards(bN).thirdProposal,
    { from: proposers(addressOf).thirdProposal },
  );
  await contracts.dao.submitPreproposal(
    proposalIds.fourthProposal,
    milestoneDurations(bN).fourthProposal.versionOne,
    milestoneFundings(bN).fourthProposal.versionOne,
    finalRewards(bN).fourthProposal,
    { from: proposers(addressOf).fourthProposal },
  );
  await contracts.dao.endorseProposal(proposalIds.firstProposal, { from: endorsers(addressOf).firstProposal });
  await contracts.dao.endorseProposal(proposalIds.secondProposal, { from: endorsers(addressOf).secondProposal });
  await contracts.dao.endorseProposal(proposalIds.thirdProposal, { from: endorsers(addressOf).thirdProposal });
  await contracts.dao.endorseProposal(proposalIds.fourthProposal, { from: endorsers(addressOf).fourthProposal });
};

const modifyProposals = async function (contracts, addressOf) {
  await contracts.dao.modifyProposal(
    proposalIds.firstProposal,
    moreVersions.firstProposal.versionTwo,
    milestoneDurations(bN).firstProposal.versionTwo,
    milestoneFundings(bN).firstProposal.versionTwo,
    finalRewards(bN).firstProposal,
    { from: proposers(addressOf).firstProposal },
  );
  await contracts.dao.modifyProposal(
    proposalIds.secondProposal,
    moreVersions.secondProposal.versionTwo,
    milestoneDurations(bN).secondProposal.versionTwo,
    milestoneFundings(bN).secondProposal.versionTwo,
    finalRewards(bN).secondProposal,
    { from: proposers(addressOf).secondProposal },
  );
  await contracts.dao.modifyProposal(
    proposalIds.thirdProposal,
    moreVersions.thirdProposal.versionTwo,
    milestoneDurations(bN).thirdProposal.versionTwo,
    milestoneFundings(bN).thirdProposal.versionTwo,
    finalRewards(bN).thirdProposal,
    { from: proposers(addressOf).thirdProposal },
  );
};

const draftVoting = async function (contracts, addressOf) {
  await contracts.daoVoting.voteOnDraft(
    proposalIds.firstProposal,
    moreVersions.firstProposal.versionTwo,
    true,
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.firstProposal,
    moreVersions.firstProposal.versionTwo,
    true,
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.firstProposal,
    moreVersions.firstProposal.versionTwo,
    true,
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.firstProposal,
    moreVersions.firstProposal.versionTwo,
    true,
    { from: addressOf.badgeHolder4 },
  );

  await contracts.daoVoting.voteOnDraft(
    proposalIds.secondProposal,
    moreVersions.secondProposal.versionTwo,
    false,
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.secondProposal,
    moreVersions.secondProposal.versionTwo,
    false,
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.secondProposal,
    moreVersions.secondProposal.versionTwo,
    false,
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.secondProposal,
    moreVersions.secondProposal.versionTwo,
    false,
    { from: addressOf.badgeHolder4 },
  );

  await contracts.daoVoting.voteOnDraft(
    proposalIds.thirdProposal,
    moreVersions.thirdProposal.versionTwo,
    true,
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.thirdProposal,
    moreVersions.thirdProposal.versionTwo,
    false,
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.thirdProposal,
    moreVersions.thirdProposal.versionTwo,
    true,
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.thirdProposal,
    moreVersions.thirdProposal.versionTwo,
    true,
    { from: addressOf.badgeHolder4 },
  );

  await contracts.daoVoting.voteOnDraft(
    proposalIds.fourthProposal,
    proposalIds.fourthProposal,
    false,
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.fourthProposal,
    proposalIds.fourthProposal,
    true,
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.fourthProposal,
    proposalIds.fourthProposal,
    true,
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.fourthProposal,
    proposalIds.fourthProposal,
    true,
    { from: addressOf.badgeHolder4 },
  );
};

const claimDraftVotingResult = async function (contracts, addressOf) {
  // first, third and fourth pass
  // second is reverted (coz its failing)
  await contracts.daoVotingClaims.claimDraftVotingResult(
    proposalIds.firstProposal,
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVotingClaims.claimDraftVotingResult(
    proposalIds.thirdProposal,
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVotingClaims.claimDraftVotingResult(
    proposalIds.fourthProposal,
    { from: addressOf.badgeHolder3 },
  );
};

const votingCommitRound = async function (contracts, addressOf) {
  const salts = {
    firstProposal: {
      badgeHolder1: randomBigNumber(bN),
      badgeHolder2: randomBigNumber(bN),
      badgeHolder3: randomBigNumber(bN),
      badgeHolder4: randomBigNumber(bN),
      dgdHolder1: randomBigNumber(bN),
      dgdHolder2: randomBigNumber(bN),
      dgdHolder3: randomBigNumber(bN),
      dgdHolder4: randomBigNumber(bN),
      dgdHolder5: randomBigNumber(bN),
      dgdHolder6: randomBigNumber(bN),
    },
    thirdProposal: {
      badgeHolder1: randomBigNumber(bN),
      badgeHolder2: randomBigNumber(bN),
      badgeHolder3: randomBigNumber(bN),
      badgeHolder4: randomBigNumber(bN),
      dgdHolder1: randomBigNumber(bN),
      dgdHolder2: randomBigNumber(bN),
      dgdHolder3: randomBigNumber(bN),
      dgdHolder4: randomBigNumber(bN),
      dgdHolder5: randomBigNumber(bN),
      dgdHolder6: randomBigNumber(bN),
    },
    fourthProposal: {
      badgeHolder1: randomBigNumber(bN),
      badgeHolder2: randomBigNumber(bN),
      badgeHolder3: randomBigNumber(bN),
      badgeHolder4: randomBigNumber(bN),
      dgdHolder1: randomBigNumber(bN),
      dgdHolder2: randomBigNumber(bN),
      dgdHolder3: randomBigNumber(bN),
      dgdHolder4: randomBigNumber(bN),
      dgdHolder5: randomBigNumber(bN),
      dgdHolder6: randomBigNumber(bN),
    },
  };
  const votes = {
    firstProposal: {
      badgeHolder1: true,
      badgeHolder2: true,
      badgeHolder3: true,
      badgeHolder4: true,
      dgdHolder1: true,
      dgdHolder2: true,
      dgdHolder3: true,
      dgdHolder4: true,
      dgdHolder5: true,
      dgdHolder6: true,
    },
    thirdProposal: {
      badgeHolder1: true,
      badgeHolder2: true,
      badgeHolder3: true,
      badgeHolder4: true,
      dgdHolder1: true,
      dgdHolder2: true,
      dgdHolder3: true,
      dgdHolder4: true,
      dgdHolder5: true,
      dgdHolder6: true,
    },
    fourthProposal: {
      badgeHolder1: true,
      badgeHolder2: true,
      badgeHolder3: true,
      badgeHolder4: true,
      dgdHolder1: true,
      dgdHolder2: true,
      dgdHolder3: true,
      dgdHolder4: true,
      dgdHolder5: true,
      dgdHolder6: true,
    },
  };
  const votingCommits = {
    firstProposal: {
      badgeHolder1: web3Utils.soliditySha3({t: 'address', v: addressOf.badgeHolder1}, {t: 'bool', v: votes.firstProposal.badgeHolder1}, {t: 'uint256', v: salts.firstProposal.badgeHolder1}),
      badgeHolder2: web3Utils.soliditySha3({t: 'address', v: addressOf.badgeHolder2}, {t: 'bool', v: votes.firstProposal.badgeHolder2}, {t: 'uint256', v: salts.firstProposal.badgeHolder2}),
      badgeHolder3: web3Utils.soliditySha3({t: 'address', v: addressOf.badgeHolder3}, {t: 'bool', v: votes.firstProposal.badgeHolder3}, {t: 'uint256', v: salts.firstProposal.badgeHolder3}),
      badgeHolder4: web3Utils.soliditySha3({t: 'address', v: addressOf.badgeHolder4}, {t: 'bool', v: votes.firstProposal.badgeHolder4}, {t: 'uint256', v: salts.firstProposal.badgeHolder4}),
      dgdHolder1: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder1}, {t: 'bool', v: votes.firstProposal.dgdHolder1}, {t: 'uint256', v: salts.firstProposal.dgdHolder1}),
      dgdHolder2: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder2}, {t: 'bool', v: votes.firstProposal.dgdHolder2}, {t: 'uint256', v: salts.firstProposal.dgdHolder2}),
      dgdHolder3: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder3}, {t: 'bool', v: votes.firstProposal.dgdHolder3}, {t: 'uint256', v: salts.firstProposal.dgdHolder3}),
      dgdHolder4: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder4}, {t: 'bool', v: votes.firstProposal.dgdHolder4}, {t: 'uint256', v: salts.firstProposal.dgdHolder4}),
      dgdHolder5: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder5}, {t: 'bool', v: votes.firstProposal.dgdHolder5}, {t: 'uint256', v: salts.firstProposal.dgdHolder5}),
      dgdHolder6: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder6}, {t: 'bool', v: votes.firstProposal.dgdHolder6}, {t: 'uint256', v: salts.firstProposal.dgdHolder6}),
    },
    thirdProposal: {
      badgeHolder1: web3Utils.soliditySha3({t: 'address', v: addressOf.badgeHolder1}, {t: 'bool', v: votes.thirdProposal.badgeHolder1}, {t: 'uint256', v: salts.thirdProposal.badgeHolder1}),
      badgeHolder2: web3Utils.soliditySha3({t: 'address', v: addressOf.badgeHolder2}, {t: 'bool', v: votes.thirdProposal.badgeHolder2}, {t: 'uint256', v: salts.thirdProposal.badgeHolder2}),
      badgeHolder3: web3Utils.soliditySha3({t: 'address', v: addressOf.badgeHolder3}, {t: 'bool', v: votes.thirdProposal.badgeHolder3}, {t: 'uint256', v: salts.thirdProposal.badgeHolder3}),
      badgeHolder4: web3Utils.soliditySha3({t: 'address', v: addressOf.badgeHolder4}, {t: 'bool', v: votes.thirdProposal.badgeHolder4}, {t: 'uint256', v: salts.thirdProposal.badgeHolder4}),
      dgdHolder1: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder1}, {t: 'bool', v: votes.thirdProposal.dgdHolder1}, {t: 'uint256', v: salts.thirdProposal.dgdHolder1}),
      dgdHolder2: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder2}, {t: 'bool', v: votes.thirdProposal.dgdHolder2}, {t: 'uint256', v: salts.thirdProposal.dgdHolder2}),
      dgdHolder3: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder3}, {t: 'bool', v: votes.thirdProposal.dgdHolder3}, {t: 'uint256', v: salts.thirdProposal.dgdHolder3}),
      dgdHolder4: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder4}, {t: 'bool', v: votes.thirdProposal.dgdHolder4}, {t: 'uint256', v: salts.thirdProposal.dgdHolder4}),
      dgdHolder5: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder5}, {t: 'bool', v: votes.thirdProposal.dgdHolder5}, {t: 'uint256', v: salts.thirdProposal.dgdHolder5}),
      dgdHolder6: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder6}, {t: 'bool', v: votes.thirdProposal.dgdHolder6}, {t: 'uint256', v: salts.thirdProposal.dgdHolder6}),
    },
    fourthProposal: {
      badgeHolder1: web3Utils.soliditySha3({t: 'address', v: addressOf.badgeHolder1}, {t: 'bool', v: votes.fourthProposal.badgeHolder1}, {t: 'uint256', v: salts.fourthProposal.badgeHolder1}),
      badgeHolder2: web3Utils.soliditySha3({t: 'address', v: addressOf.badgeHolder2}, {t: 'bool', v: votes.fourthProposal.badgeHolder2}, {t: 'uint256', v: salts.fourthProposal.badgeHolder2}),
      badgeHolder3: web3Utils.soliditySha3({t: 'address', v: addressOf.badgeHolder3}, {t: 'bool', v: votes.fourthProposal.badgeHolder3}, {t: 'uint256', v: salts.fourthProposal.badgeHolder3}),
      badgeHolder4: web3Utils.soliditySha3({t: 'address', v: addressOf.badgeHolder4}, {t: 'bool', v: votes.fourthProposal.badgeHolder4}, {t: 'uint256', v: salts.fourthProposal.badgeHolder4}),
      dgdHolder1: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder1}, {t: 'bool', v: votes.fourthProposal.dgdHolder1}, {t: 'uint256', v: salts.fourthProposal.dgdHolder1}),
      dgdHolder2: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder2}, {t: 'bool', v: votes.fourthProposal.dgdHolder2}, {t: 'uint256', v: salts.fourthProposal.dgdHolder2}),
      dgdHolder3: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder3}, {t: 'bool', v: votes.fourthProposal.dgdHolder3}, {t: 'uint256', v: salts.fourthProposal.dgdHolder3}),
      dgdHolder4: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder4}, {t: 'bool', v: votes.fourthProposal.dgdHolder4}, {t: 'uint256', v: salts.fourthProposal.dgdHolder4}),
      dgdHolder5: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder5}, {t: 'bool', v: votes.fourthProposal.dgdHolder5}, {t: 'uint256', v: salts.fourthProposal.dgdHolder5}),
      dgdHolder6: web3Utils.soliditySha3({t: 'address', v: addressOf.dgdHolder6}, {t: 'bool', v: votes.fourthProposal.dgdHolder6}, {t: 'uint256', v: salts.fourthProposal.dgdHolder6}),
    },
  };
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.badgeHolder1,
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.badgeHolder2,
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.badgeHolder3,
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.badgeHolder4,
    { from: addressOf.badgeHolder4 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.dgdHolder1,
    { from: addressOf.dgdHolder1 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.dgdHolder2,
    { from: addressOf.dgdHolder2 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.dgdHolder3,
    { from: addressOf.dgdHolder3 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.dgdHolder4,
    { from: addressOf.dgdHolder4 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.dgdHolder5,
    { from: addressOf.dgdHolder5 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.dgdHolder6,
    { from: addressOf.dgdHolder6 },
  );

  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.thirdProposal,
    votingCommits.thirdProposal.badgeHolder1,
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.thirdProposal,
    votingCommits.thirdProposal.badgeHolder2,
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.thirdProposal,
    votingCommits.thirdProposal.badgeHolder3,
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.thirdProposal,
    votingCommits.thirdProposal.badgeHolder4,
    { from: addressOf.badgeHolder4 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.thirdProposal,
    votingCommits.thirdProposal.dgdHolder1,
    { from: addressOf.dgdHolder1 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.thirdProposal,
    votingCommits.thirdProposal.dgdHolder2,
    { from: addressOf.dgdHolder2 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.thirdProposal,
    votingCommits.thirdProposal.dgdHolder3,
    { from: addressOf.dgdHolder3 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.thirdProposal,
    votingCommits.thirdProposal.dgdHolder4,
    { from: addressOf.dgdHolder4 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.thirdProposal,
    votingCommits.thirdProposal.dgdHolder5,
    { from: addressOf.dgdHolder5 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.thirdProposal,
    votingCommits.thirdProposal.dgdHolder6,
    { from: addressOf.dgdHolder6 },
  );

  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.fourthProposal,
    votingCommits.fourthProposal.badgeHolder1,
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.fourthProposal,
    votingCommits.fourthProposal.badgeHolder2,
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.fourthProposal,
    votingCommits.fourthProposal.badgeHolder3,
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.fourthProposal,
    votingCommits.fourthProposal.badgeHolder4,
    { from: addressOf.badgeHolder4 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.fourthProposal,
    votingCommits.fourthProposal.dgdHolder1,
    { from: addressOf.dgdHolder1 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.fourthProposal,
    votingCommits.fourthProposal.dgdHolder2,
    { from: addressOf.dgdHolder2 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.fourthProposal,
    votingCommits.fourthProposal.dgdHolder3,
    { from: addressOf.dgdHolder3 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.fourthProposal,
    votingCommits.fourthProposal.dgdHolder4,
    { from: addressOf.dgdHolder4 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.fourthProposal,
    votingCommits.fourthProposal.dgdHolder5,
    { from: addressOf.dgdHolder5 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.fourthProposal,
    votingCommits.fourthProposal.dgdHolder6,
    { from: addressOf.dgdHolder6 },
  );
  return {salts: salts, votes: votes};
};

const votingRevealRound = async function (contracts, addressOf, commits) {
  await waitForRevealPhase(contracts, addressOf, proposalIds.firstProposal, bN(0));

  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    commits.votes.firstProposal.badgeHolder1,
    commits.salts.firstProposal.badgeHolder1,
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    commits.votes.firstProposal.badgeHolder2,
    commits.salts.firstProposal.badgeHolder2,
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    commits.votes.firstProposal.badgeHolder3,
    commits.salts.firstProposal.badgeHolder3,
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    commits.votes.firstProposal.badgeHolder4,
    commits.salts.firstProposal.badgeHolder4,
    { from: addressOf.badgeHolder4 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    commits.votes.firstProposal.dgdHolder1,
    commits.salts.firstProposal.dgdHolder1,
    { from: addressOf.dgdHolder1 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    commits.votes.firstProposal.dgdHolder2,
    commits.salts.firstProposal.dgdHolder2,
    { from: addressOf.dgdHolder2 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    commits.votes.firstProposal.dgdHolder3,
    commits.salts.firstProposal.dgdHolder3,
    { from: addressOf.dgdHolder3 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    commits.votes.firstProposal.dgdHolder4,
    commits.salts.firstProposal.dgdHolder4,
    { from: addressOf.dgdHolder4 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    commits.votes.firstProposal.dgdHolder5,
    commits.salts.firstProposal.dgdHolder5,
    { from: addressOf.dgdHolder5 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    commits.votes.firstProposal.dgdHolder6,
    commits.salts.firstProposal.dgdHolder6,
    { from: addressOf.dgdHolder6 },
  );

  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.thirdProposal,
    commits.votes.thirdProposal.badgeHolder1,
    commits.salts.thirdProposal.badgeHolder1,
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.thirdProposal,
    commits.votes.thirdProposal.badgeHolder2,
    commits.salts.thirdProposal.badgeHolder2,
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.thirdProposal,
    commits.votes.thirdProposal.badgeHolder3,
    commits.salts.thirdProposal.badgeHolder3,
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.thirdProposal,
    commits.votes.thirdProposal.badgeHolder4,
    commits.salts.thirdProposal.badgeHolder4,
    { from: addressOf.badgeHolder4 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.thirdProposal,
    commits.votes.thirdProposal.dgdHolder1,
    commits.salts.thirdProposal.dgdHolder1,
    { from: addressOf.dgdHolder1 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.thirdProposal,
    commits.votes.thirdProposal.dgdHolder2,
    commits.salts.thirdProposal.dgdHolder2,
    { from: addressOf.dgdHolder2 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.thirdProposal,
    commits.votes.thirdProposal.dgdHolder3,
    commits.salts.thirdProposal.dgdHolder3,
    { from: addressOf.dgdHolder3 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.thirdProposal,
    commits.votes.thirdProposal.dgdHolder4,
    commits.salts.thirdProposal.dgdHolder4,
    { from: addressOf.dgdHolder4 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.thirdProposal,
    commits.votes.thirdProposal.dgdHolder5,
    commits.salts.thirdProposal.dgdHolder5,
    { from: addressOf.dgdHolder5 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.thirdProposal,
    commits.votes.thirdProposal.dgdHolder6,
    commits.salts.thirdProposal.dgdHolder6,
    { from: addressOf.dgdHolder6 },
  );

  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.fourthProposal,
    commits.votes.fourthProposal.badgeHolder1,
    commits.salts.fourthProposal.badgeHolder1,
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.fourthProposal,
    commits.votes.fourthProposal.badgeHolder2,
    commits.salts.fourthProposal.badgeHolder2,
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.fourthProposal,
    commits.votes.fourthProposal.badgeHolder3,
    commits.salts.fourthProposal.badgeHolder3,
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.fourthProposal,
    commits.votes.fourthProposal.badgeHolder4,
    commits.salts.fourthProposal.badgeHolder4,
    { from: addressOf.badgeHolder4 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.fourthProposal,
    commits.votes.fourthProposal.dgdHolder1,
    commits.salts.fourthProposal.dgdHolder1,
    { from: addressOf.dgdHolder1 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.fourthProposal,
    commits.votes.fourthProposal.dgdHolder2,
    commits.salts.fourthProposal.dgdHolder2,
    { from: addressOf.dgdHolder2 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.fourthProposal,
    commits.votes.fourthProposal.dgdHolder3,
    commits.salts.fourthProposal.dgdHolder3,
    { from: addressOf.dgdHolder3 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.fourthProposal,
    commits.votes.fourthProposal.dgdHolder4,
    commits.salts.fourthProposal.dgdHolder4,
    { from: addressOf.dgdHolder4 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.fourthProposal,
    commits.votes.fourthProposal.dgdHolder5,
    commits.salts.fourthProposal.dgdHolder5,
    { from: addressOf.dgdHolder5 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.fourthProposal,
    commits.votes.fourthProposal.dgdHolder6,
    commits.salts.fourthProposal.dgdHolder6,
    { from: addressOf.dgdHolder6 },
  );
};

const prlApproveProposals = async function (contracts, addressOf) {
  await contracts.dao.updatePRL(
    proposalIds.firstProposal,
    true,
    { from: addressOf.prl },
  );
  await contracts.dao.updatePRL(
    proposalIds.secondProposal,
    true,
    { from: addressOf.prl },
  );
  await contracts.dao.updatePRL(
    proposalIds.thirdProposal,
    true,
    { from: addressOf.prl },
  );
  await contracts.dao.updatePRL(
    proposalIds.fourthProposal,
    true,
    { from: addressOf.prl },
  );
};

const claimVotingResult = async function (contracts, addressOf) {
  await waitForRevealPhaseToGetOver(contracts, addressOf, proposalIds.fourthProposal, bN(0));
  await contracts.daoVotingClaims.claimVotingResult(
    proposalIds.firstProposal,
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVotingClaims.claimVotingResult(
    proposalIds.thirdProposal,
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVotingClaims.claimVotingResult(
    proposalIds.fourthProposal,
    { from: addressOf.badgeHolder4 },
  );
};

const claimFunding = async function (contracts, addressOf) {
  await contracts.daoFundingManager.claimEthFunding(
    proposalIds.firstProposal,
    { from: proposers(addressOf).firstProposal },
  );
};

const confirmContinuedParticipation = async function (contracts, addressOf) {
  await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolder1 });
  await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolder2 });
  await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolder3 });
  await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolder4 });
  await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolder1 });
  await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolder2 });
  await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolder3 });
  await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolder4 });
  await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolder5 });
  await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolder6 });
};

const claimDGXs = async function (contracts, addressOf) {
  await contracts.daoRewardsManager.claimRewards({ from: addressOf.badgeHolder1 });
  await contracts.daoRewardsManager.claimRewards({ from: addressOf.badgeHolder2 });
  await contracts.daoRewardsManager.claimRewards({ from: addressOf.badgeHolder3 });
  await contracts.daoRewardsManager.claimRewards({ from: addressOf.badgeHolder4 });
  await contracts.daoRewardsManager.claimRewards({ from: addressOf.dgdHolder1 });
  await contracts.daoRewardsManager.claimRewards({ from: addressOf.dgdHolder2 });
  await contracts.daoRewardsManager.claimRewards({ from: addressOf.dgdHolder3 });
  await contracts.daoRewardsManager.claimRewards({ from: addressOf.dgdHolder4 });
  await contracts.daoRewardsManager.claimRewards({ from: addressOf.dgdHolder5 });
  await contracts.daoRewardsManager.claimRewards({ from: addressOf.dgdHolder6 });
};

const interimVotingCommitRound = async function (contracts, addressOf) {
  const interimRoundVotingTime1 = await contracts.daoStorage.readProposalVotingTime.call(proposalIds.firstProposal, bN(1));
  const interimRoundVotingTime3 = await contracts.daoStorage.readProposalVotingTime.call(proposalIds.thirdProposal, bN(1));
  const interimRoundVotingTime4 = await contracts.daoStorage.readProposalVotingTime.call(proposalIds.fourthProposal, bN(1));
  console.log('interim voting proposal 1 : ', interimRoundVotingTime1);
  console.log('interim voting proposal 3 : ', interimRoundVotingTime3);
  console.log('interim voting proposal 4 : ', interimRoundVotingTime4);
};

module.exports = async function () {
  let addressOf;
  let contracts;
  let libs;
  await web3.eth.getAccounts(async function (e, accounts) {
    // deploy contracts
    addressOf = getAccountsAndAddressOf(accounts);
    console.log('got accounts');
    contracts = {};
    libs = {};

    // get deployed mock tokens
    await setupMockTokens(contracts, addressOf);
    console.log('setup tokens');

    await assignDeployedContracts(contracts, libs);
    console.log('got the deployed contracts');

    // set dummy config for testing
    await setDummyConfig(contracts, addressOf);
    console.log('setup dummy config');

    // start dao and fund dao
    await initDao(contracts, addressOf);
    console.log('setup and funded dao');

    // lock tokens and badges for locking phase of this quarter
    await approveTokens(contracts, addressOf);
    console.log('approved tokens dgd and badge');
    await lockStakeAndBadges(contracts, addressOf, phases.LOCKING_PHASE);
    console.log('locked dgds and badges in locking phase');

    // create some proposals in the main phase, assert that its the same quarter
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    await kycProposers(contracts, addressOf);
    console.log('kyc approved proposers');
    await addAndEndorseProposals(contracts, addressOf);
    console.log('added and endorsed proposals');

    // modify those proposals slightly, assert that its the same quarter
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    await modifyProposals(contracts, addressOf);
    console.log('modified proposals');

    // conduct the draft voting, assert that its the same quarter
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    await draftVoting(contracts, addressOf);
    console.log('done with draft voting round');

    // its main phase, lock more tokens
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    await lockStakeAndBadges(contracts, addressOf, phases.MAIN_PHASE);
    console.log('locked more dgds in main phase');

    // claim the voting, assert that its the same quarter
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    await claimDraftVotingResult(contracts, addressOf);
    console.log('claimed draft voting result');

    // PRL approves these proposals
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    await prlApproveProposals(contracts, addressOf);
    console.log('prl approved the proposals');

    // first voting round
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    const commits = await votingCommitRound(contracts, addressOf);
    console.log('commit voting has been done');
    await votingRevealRound(contracts, addressOf, commits);
    console.log('revealed the committed votes');

    // claim the result of the voting round
    await claimVotingResult(contracts, addressOf);
    console.log('claimed voting result');

    // proposers claim the funding for first milestone
    await claimFunding(contracts, addressOf);
    console.log('ETH funding has been claimed by the proposer');

    // wait for the quarter to end
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE, quarters.QUARTER_2);
    console.log('in the second quarter (quarterId = 2), locking phase');

    // call the global rewards calculation
    await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(20 * (10 ** 9)));
    console.log('transferred dgx to rewards manager');
    await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter({ from: addressOf.founderBadgeHolder });
    console.log('updated the rewards for previous quarter (quarterId = 1)');

    console.log('\t\t#### Info of users for last quarter: ')
    const printStake = async (user, userString) => {
      console.log(`DGDstake of ${userString} = `, await contracts.daoStakeStorage.lockedDGDStake.call(user));
      console.log(`Badge QP of ${userString}= `, await contracts.daoPointsStorage.getQuarterBadgePoint.call(user, bN(1)));
      console.log(`LockedBadge of ${userString} = `, await contracts.daoStakeStorage.lockedBadge.call(user));
      console.log(`effectiveDGDBalance of ${userString} = `, await contracts.daoRewardsManager.getUserEffectiveDGDBalanceLastQuarter.call(user));
      console.log(`effectiveBadgeBalance of ${userString} = `, await contracts.daoRewardsManager.getUserEffectiveBadgeBalanceLastQuarter.call(user));
      console.log();
    };
    await printStake(addressOf.badgeHolder1, 'addressOf.badgeHolder1');
    await printStake(addressOf.badgeHolder2, 'addressOf.badgeHolder2');
    await printStake(addressOf.badgeHolder3, 'addressOf.badgeHolder3');
    await printStake(addressOf.badgeHolder4, 'addressOf.badgeHolder4');

    // confirm participation for the next quarter
    await confirmContinuedParticipation(contracts, addressOf);
    console.log('confirmed participation of all members');

    const printPoints = async (user, userString) => {
      console.log(`Claimable DGX of ${userString} = `, await contracts.daoRewardsStorage.claimableDGXs.call(user));
      console.log(`QP of ${userString}= `, await contracts.daoPointsStorage.getQuarterPoint.call(user, bN(1)));
      console.log(`Badge QP of ${userString}= `, await contracts.daoPointsStorage.getQuarterBadgePoint.call(user, bN(1)));
      console.log(`RP of ${userString}= `, await contracts.daoPointsStorage.getReputation.call(user));
      console.log();
    };


    await printPoints(addressOf.badgeHolder1, 'addressOf.badgeHolder1');
    await printPoints(addressOf.badgeHolder2, 'addressOf.badgeHolder2');
    await printPoints(addressOf.badgeHolder3, 'addressOf.badgeHolder3');
    await printPoints(addressOf.badgeHolder4, 'addressOf.badgeHolder4');
    await claimDGXs(contracts, addressOf);
    console.log('claimed all dgxs');

    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_2);
    console.log('in the second quarter (quarterId = 2), main phase');

    await interimVotingCommitRound(contracts, addressOf);
    console.log('done with interim voting round');
  });
};
