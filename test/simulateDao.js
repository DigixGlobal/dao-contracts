const a = require('awaiting');
const assert = require('assert');

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
    true,
    bN(++lastNonces.badgeHolder1),
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.firstProposal,
    true,
    bN(++lastNonces.badgeHolder2),
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.firstProposal,
    true,
    bN(++lastNonces.badgeHolder3),
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.firstProposal,
    true,
    bN(++lastNonces.badgeHolder4),
    { from: addressOf.badgeHolder4 },
  );

  await contracts.daoVoting.voteOnDraft(
    proposalIds.secondProposal,
    false,
    bN(++lastNonces.badgeHolder1),
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.secondProposal,
    false,
    bN(++lastNonces.badgeHolder2),
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.secondProposal,
    false,
    bN(++lastNonces.badgeHolder3),
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.secondProposal,
    false,
    bN(++lastNonces.badgeHolder4),
    { from: addressOf.badgeHolder4 },
  );

  await contracts.daoVoting.voteOnDraft(
    proposalIds.thirdProposal,
    true,
    bN(++lastNonces.badgeHolder1),
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.thirdProposal,
    false,
    bN(++lastNonces.badgeHolder2),
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.thirdProposal,
    true,
    bN(++lastNonces.badgeHolder3),
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.thirdProposal,
    true,
    bN(++lastNonces.badgeHolder4),
    { from: addressOf.badgeHolder4 },
  );

  await contracts.daoVoting.voteOnDraft(
    proposalIds.fourthProposal,
    false,
    bN(++lastNonces.badgeHolder1),
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.fourthProposal,
    true,
    bN(++lastNonces.badgeHolder2),
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.fourthProposal,
    true,
    bN(++lastNonces.badgeHolder3),
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.voteOnDraft(
    proposalIds.fourthProposal,
    true,
    bN(++lastNonces.badgeHolder4),
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
  const votes = {
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
  };
  const votingCommits = {
    firstProposal: {
      badgeHolder1: web3.sha3(votes.firstProposal.badgeHolder1.toString().concat(':').concat(true.toString())),
      badgeHolder2: web3.sha3(votes.firstProposal.badgeHolder2.toString().concat(':').concat(true.toString())),
      badgeHolder3: web3.sha3(votes.firstProposal.badgeHolder3.toString().concat(':').concat(true.toString())),
      badgeHolder4: web3.sha3(votes.firstProposal.badgeHolder4.toString().concat(':').concat(true.toString())),
      dgdHolder1: web3.sha3(votes.firstProposal.dgdHolder1.toString().concat(':').concat(true.toString())),
      dgdHolder2: web3.sha3(votes.firstProposal.dgdHolder2.toString().concat(':').concat(true.toString())),
      dgdHolder3: web3.sha3(votes.firstProposal.dgdHolder3.toString().concat(':').concat(true.toString())),
      dgdHolder4: web3.sha3(votes.firstProposal.dgdHolder4.toString().concat(':').concat(true.toString())),
      dgdHolder5: web3.sha3(votes.firstProposal.dgdHolder5.toString().concat(':').concat(true.toString())),
      dgdHolder6: web3.sha3(votes.firstProposal.dgdHolder6.toString().concat(':').concat(true.toString())),
    },
  };
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.badgeHolder1,
    bN(++lastNonces.badgeHolder1),
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.badgeHolder2,
    bN(++lastNonces.badgeHolder2),
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.badgeHolder3,
    bN(++lastNonces.badgeHolder3),
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.badgeHolder4,
    bN(++lastNonces.badgeHolder4),
    { from: addressOf.badgeHolder4 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.dgdHolder1,
    bN(++lastNonces.dgdHolder1),
    { from: addressOf.dgdHolder1 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.dgdHolder2,
    bN(++lastNonces.dgdHolder2),
    { from: addressOf.dgdHolder2 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.dgdHolder3,
    bN(++lastNonces.dgdHolder3),
    { from: addressOf.dgdHolder3 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.dgdHolder4,
    bN(++lastNonces.dgdHolder4),
    { from: addressOf.dgdHolder4 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.dgdHolder5,
    bN(++lastNonces.dgdHolder5),
    { from: addressOf.dgdHolder5 },
  );
  await contracts.daoVoting.commitVoteOnProposal(
    proposalIds.firstProposal,
    votingCommits.firstProposal.dgdHolder6,
    bN(++lastNonces.dgdHolder6),
    { from: addressOf.dgdHolder6 },
  );
  return votes;
};

const votingRevealRound = async function (contracts, addressOf, votes) {
  await waitForRevealPhase(contracts, addressOf, proposalIds.firstProposal, bN(0));

  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    true,
    votes.firstProposal.badgeHolder1.toString().concat(':').concat(true.toString()),
    { from: addressOf.badgeHolder1 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    true,
    votes.firstProposal.badgeHolder2.toString().concat(':').concat(true.toString()),
    { from: addressOf.badgeHolder2 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    true,
    votes.firstProposal.badgeHolder3.toString().concat(':').concat(true.toString()),
    { from: addressOf.badgeHolder3 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    true,
    votes.firstProposal.badgeHolder4.toString().concat(':').concat(true.toString()),
    { from: addressOf.badgeHolder4 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    true,
    votes.firstProposal.dgdHolder1.toString().concat(':').concat(true.toString()),
    { from: addressOf.dgdHolder1 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    true,
    votes.firstProposal.dgdHolder2.toString().concat(':').concat(true.toString()),
    { from: addressOf.dgdHolder2 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    true,
    votes.firstProposal.dgdHolder3.toString().concat(':').concat(true.toString()),
    { from: addressOf.dgdHolder3 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    true,
    votes.firstProposal.dgdHolder4.toString().concat(':').concat(true.toString()),
    { from: addressOf.dgdHolder4 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    true,
    votes.firstProposal.dgdHolder5.toString().concat(':').concat(true.toString()),
    { from: addressOf.dgdHolder5 },
  );
  await contracts.daoVoting.revealVoteOnProposal(
    proposalIds.firstProposal,
    true,
    votes.firstProposal.dgdHolder6.toString().concat(':').concat(true.toString()),
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
  await waitForRevealPhaseToGetOver(contracts, addressOf, proposalIds.firstProposal, bN(0));
  await contracts.daoVotingClaims.claimVotingResult(
    proposalIds.firstProposal,
    { from: addressOf.badgeHolder3 },
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

const somePrinting = async function (contracts, addressOf) {
  console.log('');
  console.log('stake of badge holder 3 : ', await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolder3));
  console.log('quarter points : ', await contracts.daoQuarterPoint.balanceInQuarter.call(addressOf.badgeHolder3, bN(1)));
  console.log('reputation points : ', await contracts.daoReputationPoint.balanceOf.call(addressOf.badgeHolder3));
  console.log('dgx rewards badge holder  3 : ', await contracts.daoRewardsStorage.claimableDGXs.call(addressOf.badgeHolder3));
  console.log('');
};

const claimDGXs = async function (contracts, addressOf) {
  console.log('claiming now...');
  console.log('dgx balance : ', await contracts.dgxToken.balanceOf.call(addressOf.badgeHolder3));
  await contracts.daoRewardsManager.claimRewards({ from: addressOf.badgeHolder3 });
  console.log('dgx balance : ', await contracts.dgxToken.balanceOf.call(addressOf.badgeHolder3));
  console.log('claimed successfully');
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
    const votes = await votingCommitRound(contracts, addressOf);
    console.log('commit voting has been done');
    await votingRevealRound(contracts, addressOf, votes);
    console.log('revealed the committed votes');

    // claim the result of the voting round
    await claimVotingResult(contracts, addressOf);
    console.log('claimed voting result');

    // proposers claim the funding for first milestone
    await claimFunding(contracts, addressOf);
    console.log('ETH funding has been claimed by the proposer');

    // await somePrinting(contracts, addressOf);

    // wait for the quarter to end
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE, quarters.QUARTER_2);
    console.log('in the second quarter (quarterId = 2), locking phase');

    // test if locking phase
    assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
    assert(await a.failure(contracts.daoStakeLocking.isMainPhase.call()));

    // call the global rewards calculation
    await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(20 * (10 ** 9)));
    console.log('transferred dgx to rewards manager');
    await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter({ from: addressOf.founderBadgeHolder });
    console.log('updated the rewards for previous quarter (quarterId = 1)');

    console.log('--------')
    console.log('quarter info for quarter1 : ', await contracts.daoRewardsStorage.readQuarterInfo.call(bN(1)));
    console.log('--------')
    console.log('quarter info for quarter2 : ', await contracts.daoRewardsStorage.readQuarterInfo.call(bN(2)));
    console.log('--------')

    // confirm participation for the next quarter
    await confirmContinuedParticipation(contracts, addressOf);
    console.log('confirmed participation of all members');

    // await somePrinting(contracts, addressOf);

    await claimDGXs(contracts, addressOf);
  });
};
