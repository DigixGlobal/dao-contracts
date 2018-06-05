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
 *  addressOf.badgeHolders[0]        10 * (10 ** 9)              5
 *  addressOf.badgeHolders[1]        30 * (10 ** 9)              12
 *  addressOf.badgeHolders[2]        40 * (10 ** 9)              15
 *  addressOf.badgeHolders[3]        20 * (10 ** 9)              18
 *  addressOf.dgdHolders[0]          10 * (10 ** 9)              0
 *  addressOf.dgdHolders[1]          15 * (10 ** 9)              0
 *  addressOf.dgdHolders[2]          0  * (10 ** 9)              0
 *  addressOf.dgdHolders[3]          0  * (10 ** 9)              0
 *  addressOf.dgdHolders[4]          5  * (10 ** 9)              0
 *  addressOf.dgdHolders[5]          30 * (10 ** 9)              0
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
 *  firstProposal                 addressof.badgeHolders[0]      yes
 *  firstProposal                 addressof.badgeHolders[1]      yes
 *  firstProposal                 addressof.badgeHolders[2]      yes
 *  firstProposal                 addressof.badgeHolders[3]      yes
 *                      ---------------------------
 *  secondProposal                addressof.badgeHolders[0]      no
 *  secondProposal                addressof.badgeHolders[1]      no
 *  secondProposal                addressof.badgeHolders[2]      no
 *  secondProposal                addressof.badgeHolders[3]      no
 *                      ---------------------------
 *  thirdProposal                 addressof.badgeHolders[0]      yes
 *  thirdProposal                 addressof.badgeHolders[1]      no
 *  thirdProposal                 addressof.badgeHolders[2]      yes
 *  thirdProposal                 addressof.badgeHolders[3]      yes
 *                      ---------------------------
 *  fourthProposal                addressof.badgeHolders[0]      no
 *  fourthProposal                addressof.badgeHolders[1]      yes
 *  fourthProposal                addressof.badgeHolders[2]      yes
 *  fourthProposal                addressof.badgeHolders[3]      yes
 *
 *                   ----- LOCK MORE DGDs (MAIN PHASE) -----
 *  ADDRESS                       DGD TOKENS
 *  addressOf.badgeHolders[0]        10 * (10 ** 9)
 *  addressOf.badgeHolders[1]        20 * (10 ** 9)
 *  addressOf.badgeHolders[2]        20 * (10 ** 9)
 *  addressOf.badgeHolders[3]        55 * (10 ** 9)
 *  addressOf.dgdHolders[0]          6 * (10 ** 9)
 *  addressOf.dgdHolders[1]          15 * (10 ** 9)
 *  addressOf.dgdHolders[2]          10 * (10 ** 9)
 *  addressOf.dgdHolders[3]          12 * (10 ** 9)
 *  addressOf.dgdHolders[4]          5 * (10 ** 9)
 *  addressOf.dgdHolders[5]          10 * (10 ** 9)
 *
 *                     ------ VOTING ON PROPOSALS ------
 *  PROPOSAL                      ADDRESS                     DRAFT_VOTES
 *  firstProposal                 addressof.badgeHolders[0]      yes
 *  firstProposal                 addressof.badgeHolders[1]      yes
 *  firstProposal                 addressof.badgeHolders[2]      yes
 *  firstProposal                 addressof.badgeHolders[3]      yes
 *  firstProposal                 addressof.dgdHolders[0]        yes
 *  firstProposal                 addressof.dgdHolders[1]        yes
 *  firstProposal                 addressof.dgdHolders[2]        yes
 *  firstProposal                 addressof.dgdHolders[3]        yes
 *  firstProposal                 addressof.dgdHolders[4]        yes
 *  firstProposal                 addressof.dgdHolders[5]        yes
 */

const {
  getAccountsAndAddressOf,
  initialTransferTokens,
  getTestProposals,
  BADGE_HOLDER_COUNT,
  DGD_HOLDER_COUNT,
} = require('./setup');

const {
  daoConstantsKeys,
  phases,
  quarters,
  assertQuarter,
  getTimeToNextPhase,
  getPhase,
} = require('./daoHelpers');

const {
  getCurrentTimestamp,
  randomBigNumber,
  indexRange,
  randomBytes32,
  randomBigNumbers,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

const dotenv = require('dotenv');

let salts;
let votes;
let votingCommits;
let proposals;

const assignVotesAndCommits = function (addressOf) {
  salts = indexRange(0, 4).map(() => indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(() => randomBigNumber(bN)));
  // salts[proposalIndex][participantIndex] = salt

  votes = indexRange(0, 4).map(() => indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(() => true));
  // votes[proposalIndex][holderIndex] = true/false

  votingCommits = indexRange(0, 4).map(proposalIndex => indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(holderIndex => web3Utils.soliditySha3(
    { t: 'address', v: addressOf.allParticipants[holderIndex] },
    { t: 'bool', v: votes[proposalIndex][holderIndex] },
    { t: 'uint256', v: salts[proposalIndex][holderIndex] },
  )));
  // votingCommits[proposalIndex][holderIndex] contains the commit
};

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
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().SPECIAL_PROPOSAL_COMMIT_PHASE, bN(10));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().SPECIAL_PROPOSAL_PHASE_TOTAL, bN(20));
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
  await a.map(indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), 20, async (index) => {
    await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(2 ** 255), { from: addressOf.allParticipants[index] });
    await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(2 ** 255), { from: addressOf.allParticipants[index] });
  });
};

const lockStakeAndBadges = async function (contracts, addressOf, phase) {
  if (phase === phases.LOCKING_PHASE) {
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockBadge(bN(5), { from: addressOf.badgeHolders[0] });
    await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.badgeHolders[0] });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockBadge(bN(12), { from: addressOf.badgeHolders[1] });
    await contracts.daoStakeLocking.lockDGD(bN(30 * (10 ** 9)), { from: addressOf.badgeHolders[1] });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockBadge(bN(15), { from: addressOf.badgeHolders[2] });
    await contracts.daoStakeLocking.lockDGD(bN(40 * (10 ** 9)), { from: addressOf.badgeHolders[2] });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockBadge(bN(18), { from: addressOf.badgeHolders[3] });
    await contracts.daoStakeLocking.lockDGD(bN(20 * (10 ** 9)), { from: addressOf.badgeHolders[3] });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.dgdHolders[0] });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(15 * (10 ** 9)), { from: addressOf.dgdHolders[1] });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(5 * (10 ** 9)), { from: addressOf.dgdHolders[4] });
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(30 * (10 ** 9)), { from: addressOf.dgdHolders[5] });
  }

  if (phase === phases.MAIN_PHASE) {
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(6 * (10 ** 9)), { from: addressOf.dgdHolders[0] });
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(15 * (10 ** 9)), { from: addressOf.dgdHolders[1] });
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.dgdHolders[2] });
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(12 * (10 ** 9)), { from: addressOf.dgdHolders[3] });
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(5 * (10 ** 9)), { from: addressOf.dgdHolders[4] });
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE);
    await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.dgdHolders[5] });
  }
};

const kycProposers = async function (contracts, addressOf) {
  const expiry = getCurrentTimestamp() + 2628000; // KYC valid for 1 month
  await contracts.daoIdentity.updateKyc(proposals[0].proposer, '', expiry, { from: addressOf.kycadmin });
  await contracts.daoIdentity.updateKyc(proposals[1].proposer, '', expiry, { from: addressOf.kycadmin });
  await contracts.daoIdentity.updateKyc(proposals[2].proposer, '', expiry, { from: addressOf.kycadmin });
  await contracts.daoIdentity.updateKyc(proposals[3].proposer, '', expiry, { from: addressOf.kycadmin });
};

const addAndEndorseProposals = async function (contracts) {
  await a.map(indexRange(0, 4), 20, async (index) => {
    await contracts.dao.submitPreproposal(
      proposals[index].id,
      proposals[index].versions[0].milestoneDurations,
      proposals[index].versions[0].milestoneFundings,
      proposals[index].versions[0].finalReward,
      { from: proposals[index].proposer },
    );
    await contracts.dao.endorseProposal(proposals[index].id, { from: proposals[index].endorser });
  });
};

const modifyProposals = async function (contracts) {
  await a.map(indexRange(0, 3), 20, async (index) => {
    await contracts.dao.modifyProposal(
      proposals[index].id,
      proposals[index].versions[1].versionId,
      proposals[index].versions[1].milestoneDurations,
      proposals[index].versions[1].milestoneFundings,
      proposals[index].versions[1].finalReward,
      { from: proposals[index].proposer },
    );
  });
};

const draftVoting = async function (contracts, addressOf) {
  await a.map(indexRange(0, 3), 20, async (proposalIndex) => {
    await a.map(indexRange(0, 4), 20, async (badgeHolderIndex) => {
      await contracts.daoVoting.voteOnDraft(
        proposals[proposalIndex].id,
        proposals[proposalIndex].versions[1].versionId,
        true,
        { from: addressOf.badgeHolders[badgeHolderIndex] },
      );
    });
  });
  await a.map(indexRange(0, 4), 20, async (badgeHolderIndex) => {
    await contracts.daoVoting.voteOnDraft(
      proposals[3].id,
      proposals[3].id,
      true,
      { from: addressOf.badgeHolders[badgeHolderIndex] },
    );
  });
};

const claimDraftVotingResult = async function (contracts, addressOf) {
  // first, third and fourth pass
  // second is reverted (coz its failing)
  await contracts.daoVotingClaims.claimDraftVotingResult(
    proposals[0].id,
    { from: addressOf.badgeHolders[2] },
  );
  await contracts.daoVotingClaims.claimDraftVotingResult(
    proposals[2].id,
    { from: addressOf.badgeHolders[2] },
  );
  await contracts.daoVotingClaims.claimDraftVotingResult(
    proposals[3].id,
    { from: addressOf.badgeHolders[2] },
  );
};

const votingCommitRound = async function (contracts, addressOf) {
  await a.map(indexRange(0, 4), 20, async (proposalIndex) => {
    if (proposalIndex === 1) return;
    await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (holderIndex) => {
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[proposalIndex].id,
        votingCommits[proposalIndex][holderIndex],
        { from: addressOf.allParticipants[holderIndex] },
      );
    });
  });
};

const votingRevealRound = async function (contracts, addressOf, commits) {
  await waitForRevealPhase(contracts, addressOf, proposals[0].id, bN(0));

  await a.map(indexRange(0, 4), 20, async (proposalIndex) => {
    if (proposalIndex === 1) return;
    await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (holderIndex) => {
      await contracts.daoVoting.revealVoteOnProposal(
        proposals[proposalIndex].id,
        commits.v[proposalIndex][holderIndex],
        commits.s[proposalIndex][holderIndex],
        { from: addressOf.allParticipants[holderIndex] },
      );
    });
  });
};

const prlApproveProposals = async function (contracts, addressOf) {
  await a.map(indexRange(0, 4), 20, async (proposalIndex) => {
    await contracts.dao.updatePRL(
      proposals[proposalIndex].id,
      true,
      { from: addressOf.prl },
    );
  });
};

const claimVotingResult = async function (contracts, addressOf) {
  await waitForRevealPhaseToGetOver(contracts, addressOf, proposals[3].id, bN(0));
  await a.map(indexRange(0, 4), 20, async (proposalIndex) => {
    if (proposalIndex === 1) return;
    await contracts.daoVotingClaims.claimVotingResult(
      proposals[proposalIndex].id,
      { from: addressOf.badgeHolders[0] },
    );
  });
};

const claimFunding = async function (contracts) {
  await contracts.daoFundingManager.claimEthFunding(
    proposals[0].id,
    { from: proposals[0].proposer },
  );
};

const confirmContinuedParticipation = async function (contracts, addressOf) {
  await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (index) => {
    await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.allParticipants[index] });
  });
};

const claimDGXs = async function (contracts, addressOf) {
  await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (index) => {
    await contracts.daoRewardsManager.claimRewards({ from: addressOf.allParticipants[index] });
  });
};

const interimVotingCommitRound = async function (contracts, addressOf) {
  const interimRoundVotingTime4 = await contracts.daoStorage.readProposalVotingTime.call(proposals[3].id, bN(1));
  const timeNow = getCurrentTimestamp();
  if (timeNow === interimRoundVotingTime4.toNumber()) {
    await waitFor(1, addressOf);
  }

  await a.map(indexRange(0, 4), 20, async (proposalIndex) => {
    if (proposalIndex === 1) return;
    await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (holderIndex) => {
      await contracts.daoVoting.commitVoteOnInterim(
        proposals[proposalIndex].id,
        bN(1),
        votingCommits[proposalIndex][holderIndex],
        { from: addressOf.allParticipants[holderIndex] },
      );
    });
  });
};

const interimVotingRevealRound = async function (contracts, addressOf) {
  await waitForRevealPhase(contracts, addressOf, proposals[0].id, bN(1));

  await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (holderIndex) => {
    await contracts.daoVoting.revealVoteOnInterim(
      proposals[0].id,
      bN(1),
      votes[0][holderIndex],
      salts[0][holderIndex],
      { from: addressOf.allParticipants[holderIndex] },
    );
  });
};

const interimVotingRoundClaim = async function (contracts, addressOf) {
  await a.map(indexRange(0, 4), 20, async (proposalIndex) => {
    if (proposalIndex === 1) return;
    await contracts.daoVotingClaims.claimInterimVotingResult(proposals[proposalIndex].id, bN(1), { from: addressOf.dgdHolders[0] });
  });
};

const interimCommitRound = async function (contracts, addressOf, proposalIndex, index) {
  await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (holderIndex) => {
    await contracts.daoVoting.commitVoteOnInterim(
      proposals[proposalIndex].id,
      index,
      votingCommits[proposalIndex][holderIndex],
      { from: addressOf.allParticipants[holderIndex] },
    );
  });
};

const interimRevealRound = async function (contracts, addressOf, proposalIndex, index) {
  await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (holderIndex) => {
    await contracts.daoVoting.revealVoteOnInterim(
      proposals[proposalIndex].id,
      index,
      votes[proposalIndex][holderIndex],
      salts[proposalIndex][holderIndex],
      { from: addressOf.allParticipants[holderIndex] },
    );
  });
};

const claimFinalReward = async function (contracts, addressOf, proposalId, proposer) {
  await contracts.daoFundingManager.claimEthFunding(
    proposalId,
    { from: proposer },
  );
};

const specialProposalVoting = async function (contracts, addressOf, specialProposalId) {
  const someSalts = randomBigNumbers(bN, 10);

  await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (holderIndex) => {
    await contracts.daoVoting.commitVoteOnSpecialProposal(
      specialProposalId,
      web3Utils.soliditySha3({ t: 'address', v: addressOf.allParticipants[holderIndex] }, { t: 'bool', v: true }, { t: 'uint256', v: someSalts[holderIndex] }),
      { from: addressOf.allParticipants[holderIndex] },
    );
  });
  console.log('committed votes on special proposal');

  await waitFor(10, addressOf); // 10 seconds of commit phase

  await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (holderIndex) => {
    await contracts.daoVoting.revealVoteOnSpecialProposal(
      specialProposalId,
      true,
      someSalts[holderIndex],
      { from: addressOf.allParticipants[holderIndex] },
    );
  });
  console.log('revealed votes on special proposal');

  await waitFor(10, addressOf); // 10 seconds of reveal phase
  await contracts.daoVotingClaims.claimSpecialProposalVotingResult(specialProposalId, { from: addressOf.dgdHolders[4] });
};

module.exports = async function () {
  let addressOf;
  let contracts;
  let libs;
  await web3.eth.getAccounts(async function (e, accounts) {
    // deploy contracts
    addressOf = getAccountsAndAddressOf(accounts);
    console.log('addressOf = ', addressOf);
    proposals = getTestProposals(bN, addressOf);

    console.log('got accounts');
    contracts = {};
    libs = {};
    assignVotesAndCommits(addressOf);

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
    await addAndEndorseProposals(contracts);
    console.log('added and endorsed proposals');

    // modify those proposals slightly, assert that its the same quarter
    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    await modifyProposals(contracts);
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
    await votingCommitRound(contracts, addressOf);
    console.log('commit voting has been done');
    await votingRevealRound(contracts, addressOf, { v: votes, s: salts });
    console.log('revealed the committed votes');

    // claim the result of the voting round
    await claimVotingResult(contracts, addressOf);
    console.log('claimed voting result');

    // proposers claim the funding for first milestone
    await claimFunding(contracts);
    console.log('ETH funding has been claimed by the proposer');

    // wait for the quarter to end
    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE, quarters.QUARTER_2);
    console.log('in the second quarter (quarterId = 2), locking phase');

    // call the global rewards calculation
    await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(20 * (10 ** 9)));
    console.log('transferred dgx to rewards manager');
    await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter({ from: addressOf.founderBadgeHolder });
    console.log('updated the rewards for previous quarter (quarterId = 1)');

    console.log('\t\t#### Info of users for last quarter: ');
    const printStake = async (user, userString) => {
      console.log(`DGDstake of ${userString} = `, await contracts.daoStakeStorage.lockedDGDStake.call(user));
      console.log(`Badge QP of ${userString}= `, await contracts.daoPointsStorage.getQuarterBadgePoint.call(user, bN(1)));
      console.log(`LockedBadge of ${userString} = `, await contracts.daoStakeStorage.lockedBadge.call(user));
      console.log(`effectiveDGDBalance of ${userString} = `, await contracts.daoRewardsManager.getUserEffectiveDGDBalanceLastQuarter.call(user));
      console.log(`effectiveBadgeBalance of ${userString} = `, await contracts.daoRewardsManager.getUserEffectiveBadgeBalanceLastQuarter.call(user));
      console.log();
    };
    await printStake(addressOf.badgeHolders[0], 'addressOf.badgeHolders[0]');
    await printStake(addressOf.badgeHolders[1], 'addressOf.badgeHolders[1]');
    await printStake(addressOf.badgeHolders[2], 'addressOf.badgeHolders[2]');
    await printStake(addressOf.badgeHolders[3], 'addressOf.badgeHolders[3]');

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


    await printPoints(addressOf.badgeHolders[0], 'addressOf.badgeHolders[0]');
    await printPoints(addressOf.badgeHolders[1], 'addressOf.badgeHolders[1]');
    await printPoints(addressOf.badgeHolders[2], 'addressOf.badgeHolders[2]');
    await printPoints(addressOf.badgeHolders[3], 'addressOf.badgeHolders[3]');
    await claimDGXs(contracts, addressOf);
    console.log('claimed all dgxs');

    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_2);
    console.log('in the second quarter (quarterId = 2), main phase');

    // create some fake proposals to draft vote on
    await contracts.dao.modifyProposal(
      proposals[1].id,
      proposals[1].versions[2].versionId,
      proposals[1].versions[2].milestoneDurations,
      proposals[1].versions[2].milestoneFundings,
      proposals[1].versions[2].finalReward,
      { from: proposals[1].proposer },
    );
    await a.map(indexRange(0, 4), 20, async (badgeHolderIndex) => {
      await contracts.daoVoting.voteOnDraft(
        proposals[1].id,
        proposals[1].versions[2].versionId,
        true,
        { from: addressOf.badgeHolders[badgeHolderIndex] },
      );
    });

    await interimVotingCommitRound(contracts, addressOf);
    console.log('done with interim voting commit round');

    await interimVotingRevealRound(contracts, addressOf);
    console.log('done with interim voting reveal round');

    await waitForRevealPhaseToGetOver(contracts, addressOf, proposals[0].id, bN(1));
    await interimVotingRoundClaim(contracts, addressOf);
    console.log('done with claiming interim round voting');

    await claimFunding(contracts);
    console.log('claimed funding after interim voting phase');

    await phaseCorrection(contracts, addressOf, phases.LOCKING_PHASE, quarters.QUARTER_3);
    console.log('in the third quarter (quarterId = 3), locking phase');

    await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(25 * (10 ** 9)));
    console.log('transferred dgx to rewards manager');
    await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter({ from: addressOf.founderBadgeHolder });
    console.log('updated the rewards for previous quarter (quarterId = 2)');

    await confirmContinuedParticipation(contracts, addressOf);
    console.log('confirmed participation of all members');

    await phaseCorrection(contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_3);
    console.log('in the main phase, now going for interim voting after last milestone');

    await interimCommitRound(contracts, addressOf, 0, bN(2));
    console.log('last section');
    await waitForRevealPhase(contracts, addressOf, proposals[0].id, bN(2));
    console.log('last section');
    await interimRevealRound(contracts, addressOf, 0, bN(2));
    console.log('last section');
    await waitForRevealPhaseToGetOver(contracts, addressOf, proposals[0].id, bN(2));
    console.log('last section');
    await claimFinalReward(contracts, addressOf, proposals[0].id, proposals[0].proposer);
    console.log('last section');

    // special proposal section
    const uintConfigs = await contracts.daoConfigsStorage.readUintConfigs.call();
    console.log('-------------------------------------------------------------');
    console.log('configs are : ', uintConfigs);
    console.log('qp for milestone : ', uintConfigs[24]);
    console.log('rep point per extra qp : ', uintConfigs[25]);
    console.log('minimal badge participation : ', uintConfigs[40]);
    console.log('-------------------------------------------------------------');
    const specialProposalId = randomBytes32();
    // set quarter point for milestone completion to be 5 (previously 3)
    // set reputation per extra quarter point to be 3 (previously 5)
    // set minimal badge participation to be 2 (previously 3)
    uintConfigs[24] = bN(5);
    uintConfigs[25] = bN(3);
    uintConfigs[40] = bN(2);
    await contracts.dao.createSpecialProposal(
      specialProposalId,
      uintConfigs,
      [],
      [],
      { from: addressOf.founderBadgeHolder },
    );
    console.log('created special proposal');
    // vote on special proposal everybody
    await specialProposalVoting(contracts, addressOf, specialProposalId);
    const uintConfigs2 = await contracts.daoConfigsStorage.readUintConfigs.call();
    console.log('-------------------------------------------------------------');
    console.log('configs are (now) : ', uintConfigs2);
    console.log('qp for milestone (now) : ', uintConfigs[24]);
    console.log('rep point per extra qp (now) : ', uintConfigs[25]);
    console.log('minimal badge participation (now) : ', uintConfigs[40]);
    console.log('-------------------------------------------------------------');
    // end special proposal section
  });
};
