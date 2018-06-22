const a = require('awaiting');
const web3Utils = require('web3-utils');

const MockDGD = artifacts.require('./MockDGD.sol');
const MockBadge = artifacts.require('./MockBadge.sol');
const MockDgxStorage = artifacts.require('./MockDgxStorage.sol');
const MockDgx = artifacts.require('./MockDgx.sol');
const MockDgxDemurrageReporter = artifacts.require('./MockDgxDemurrageReporter.sol');

const ContractResolver = artifacts.require('./ContractResolver.sol');
const DoublyLinkedList = artifacts.require('./DoublyLinkedList.sol');

const DaoIdentityStorage = artifacts.require('./DaoIdentityStorage.sol');
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
  fundUserAndApproveForStakeLocking,
  lockDGDs,
  getTestProposals,
  getAccountsAndAddressOf,
  assignVotesAndCommits,
  setDummyConfig,
  initialTransferTokens,
  waitForRevealPhase,
  waitForRevealPhaseToGetOver,
  waitFor,
  phaseCorrection,
  initDao,
  addProposal,
  redeemBadges,
  endorseProposal,
  BADGE_HOLDER_COUNT,
  DGD_HOLDER_COUNT,
  modifyProposal,
  printProposalDetails,
} = require('./setup');

const {
  phases,
  quarters,
} = require('./daoHelpers');

const {
  getCurrentTimestamp,
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
let participants;

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

  contracts.daoIdentityStorage = await DaoIdentityStorage.deployed();
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
  contracts.daoRewardsManager = await DaoRewardsManager.deployed();
};

const kycProposers = async function (contracts, addressOf) {
  const expiry = getCurrentTimestamp() + 2628000; // KYC valid for 1 month
  await contracts.daoIdentity.updateKyc(proposals[0].proposer, '', expiry, { from: addressOf.kycadmin });
  await contracts.daoIdentity.updateKyc(proposals[1].proposer, '', expiry, { from: addressOf.kycadmin });
  await contracts.daoIdentity.updateKyc(proposals[2].proposer, '', expiry, { from: addressOf.kycadmin });
  await contracts.daoIdentity.updateKyc(proposals[3].proposer, '', expiry, { from: addressOf.kycadmin });
};

const modifyProposals = async function (contracts) {
  await a.map(proposals.slice(0, 3), 20, async (proposal) => {
    await modifyProposal(contracts, proposal, 1);
  });
};

const draftVoting = async function (contracts, addressOf, proposals) {
  await a.map(indexRange(0, 3), 20, async (proposalIndex) => {
    console.log('Draft voting for proposalIndex ', proposalIndex);
    await a.map(indexRange(0, 4), 20, async (badgeHolderIndex) => {
      await contracts.daoVoting.voteOnDraft(
        proposals[proposalIndex].id,
        proposals[proposalIndex].versions[1].versionId,
        true,
        { from: addressOf.badgeHolders[badgeHolderIndex] },
      );
      console.log('\t\t Done draft voting by badge holder index ', badgeHolderIndex, ' proposal ', proposalIndex);
    });
  });
  await a.map(indexRange(0, 4), 20, async (badgeHolderIndex) => {
    await contracts.daoVoting.voteOnDraft(
      proposals[3].id,
      proposals[3].id,
      true,
      { from: addressOf.badgeHolders[badgeHolderIndex] },
    );
    console.log('\t\t Done draft voting by badge holder index ', badgeHolderIndex, ' proposal ', 3);
  });
};

const claimDraftVotingResult = async function (contracts) {
  // first, third and fourth pass
  // second is reverted (coz its failing)
  // console.log(await contracts.daoVoting)
  const mods = await contracts.daoListingService.listModerators.call(await contracts.daoStakeStorage.readTotalModerators.call(), true);
  console.log(await contracts.daoStorage.readDraftVotingCount.call(proposals[0].id, mods));
  console.log(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call());
  console.log(await contracts.daoCalculatorService.minimumDraftQuorum.call(proposals[0].id));
  console.log(mods);
  await contracts.daoVotingClaims.claimDraftVotingResult(
    proposals[0].id,
    { from: proposals[0].proposer },
  );
  await contracts.daoVotingClaims.claimDraftVotingResult(
    proposals[2].id,
    { from: proposals[2].proposer },
  );
  await contracts.daoVotingClaims.claimDraftVotingResult(
    proposals[3].id,
    { from: proposals[3].proposer },
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
  await waitForRevealPhase(contracts, addressOf, proposals[0].id, bN(0), bN, web3);

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

const prlApproveProposals = async function (contracts, index, addressOf) {
  await a.map(indexRange(0, 4), 20, async (proposalIndex) => {
    await contracts.dao.updatePRL(
      proposals[proposalIndex].id,
      index,
      true,
      { from: addressOf.prl },
    );
  });
};

const claimVotingResult = async function (contracts, addressOf) {
  await waitForRevealPhaseToGetOver(contracts, addressOf, proposals[3].id, bN(0), bN, web3);
  await a.map(indexRange(0, 4), 20, async (proposalIndex) => {
    if (proposalIndex === 1) return;
    await contracts.daoVotingClaims.claimVotingResult(
      proposals[proposalIndex].id,
      { from: proposals[proposalIndex].proposer },
    );
  });
};

const claimFunding = async function (contracts, index) {
  const value = index < proposals[0].versions[1].milestoneCount ? proposals[0].versions[1].milestoneFundings[index] : proposals[0].versions[1].finalReward;
  await contracts.daoFundingManager.claimEthFunding(
    proposals[0].id,
    bN(index),
    value,
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
  // const interimRoundVotingTime4 = await contracts.daoStorage.readProposalVotingTime.call(proposals[3].id, bN(1));
  // const timeNow = getCurrentTimestamp();
  await waitFor(1, addressOf, web3);

  await a.map(indexRange(0, 4), 20, async (proposalIndex) => {
    if (proposalIndex === 1) return;
    console.log('Relative time of start of interim voting time = ', (await contracts.daoStorage.readProposalVotingTime.call(proposals[proposalIndex].id, bN(1))).toNumber() - getCurrentTimestamp());
    await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (holderIndex) => {
      console.log(`\t\tInterim commit Voting by holder index ${holderIndex} on proposal ${proposalIndex}`);
      await contracts.daoVoting.commitVoteOnInterim(
        proposals[proposalIndex].id,
        bN(1),
        votingCommits[proposalIndex][holderIndex],
        { from: addressOf.allParticipants[holderIndex] },
      );
      console.log(`\t\t\tDone interim commit Voting by holder index ${holderIndex} on proposal ${proposalIndex}`);
    });
  });
};

const interimVotingRevealRound = async function (contracts, addressOf) {
  await waitForRevealPhase(contracts, addressOf, proposals[0].id, bN(1), bN, web3);
  console.log('Proposal being revealed = ', proposals[0].id);

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

const interimVotingRoundClaim = async function (contracts) {
  await a.map(indexRange(0, 4), 20, async (proposalIndex) => {
    if (proposalIndex === 1) return;
    await contracts.daoVotingClaims.claimInterimVotingResult(proposals[proposalIndex].id, bN(1), { from: proposals[proposalIndex].proposer });
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
  console.log('Proposal being revealed = ', proposals[proposalIndex].id);
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

const claimFinalReward = async function (contracts, addressOf, proposalId, proposer, index) {
  console.log(`proposer is ${proposer}, proposalId = ${proposalId}`);
  console.log('claimable Eth of proposer = ', await contracts.daoFundingStorage.claimableEth.call(proposer));
  const value = index >= proposals[0].versions[1].milestoneCount ? proposals[0].versions[1].finalReward : proposals[0].versions[1].milestoneFundings[index];
  await contracts.daoFundingManager.claimEthFunding(
    proposalId,
    bN(index),
    value,
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

  await waitFor(10, addressOf, web3); // 10 seconds of commit phase

  await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (holderIndex) => {
    await contracts.daoVoting.revealVoteOnSpecialProposal(
      specialProposalId,
      true,
      someSalts[holderIndex],
      { from: addressOf.allParticipants[holderIndex] },
    );
  });
  console.log('revealed votes on special proposal');

  await waitFor(10, addressOf, web3); // 10 seconds of reveal phase
  await contracts.daoVotingClaims.claimSpecialProposalVotingResult(specialProposalId, { from: addressOf.founderBadgeHolder });
};

const addAndEndorseProposals = async function (contracts, proposals) {
  await a.map(proposals, 20, async (proposal) => {
    await addProposal(contracts, proposal);
    await endorseProposal(contracts, proposal);
  });
};

const finalizeProposals = async function (contracts, proposals) {
  await a.map(proposals, 20, async (proposal) => {
    await contracts.dao.finalizeProposal(proposal.id, { from: proposal.proposer });
  });
};

module.exports = async function () {
  const addressOf = {};
  const contracts = {};
  const libs = {};
  await web3.eth.getAccounts(async function (e, accounts) {
    // deploy contracts
    getAccountsAndAddressOf(accounts, addressOf);
    console.log('addressOf = ', addressOf);

    participants = [
      {
        address: addressOf.badgeHolders[0],
        redeemingBadge: true,
        dgdToLock: bN(110e9),
      },
      {
        address: addressOf.badgeHolders[1],
        redeemingBadge: true,
        dgdToLock: bN(200e9),
      },
      {
        address: addressOf.badgeHolders[2],
        redeemingBadge: true,
        dgdToLock: bN(200e9),
      },
      {
        address: addressOf.badgeHolders[3],
        redeemingBadge: true,
        dgdToLock: bN(550e9),
      },
      {
        address: addressOf.dgdHolders[0],
        dgdToLock: bN(60e9),
      },
      {
        address: addressOf.dgdHolders[1],
        dgdToLock: bN(150e9),
      },
      {
        address: addressOf.dgdHolders[2],
        dgdToLock: bN(100e9),
      },
      {
        address: addressOf.dgdHolders[3],
        dgdToLock: bN(120e9),
      },
      {
        address: addressOf.dgdHolders[4],
        dgdToLock: bN(50e9),
      },
      {
        address: addressOf.dgdHolders[5],
        dgdToLock: bN(100e9),
      },
    ];

    proposals = getTestProposals(bN, addressOf);

    console.log('got accounts');
    ({ salts, votes, votingCommits } = assignVotesAndCommits(addressOf, bN));

    // get deployed mock tokens
    await setupMockTokens(contracts, addressOf);
    console.log('setup tokens');

    await assignDeployedContracts(contracts, libs);
    console.log('got the deployed contracts');

    // set dummy config for testing
    await setDummyConfig(contracts, bN);
    console.log('setup dummy config');

    // start dao and fund dao
    await initDao(contracts, addressOf, bN, web3);
    console.log('setup and funded dao');

    await fundUserAndApproveForStakeLocking(web3, contracts, bN, participants);
    console.log('\tfunded users DGDs and Badges');
    await lockDGDs(web3, contracts, bN, participants);
    console.log('\tusers locked DGDs for first quarter');
    await redeemBadges(web3, contracts, bN, participants);
    console.log('\tusers redeemed badges');

    // create some proposals in the main phase, assert that its the same quarter
    await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    await kycProposers(contracts, addressOf);
    console.log('kyc approved proposers');

    await addAndEndorseProposals(contracts, proposals);
    console.log('added and endorsed proposals');

    // modify those proposals slightly, assert that its the same quarter
    await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    await modifyProposals(contracts);
    console.log('modified proposals');

    await finalizeProposals(contracts, proposals);
    console.log('finalized proposals');

    await draftVoting(contracts, addressOf, proposals);
    console.log('done draft voting');

    // its main phase, lock more tokens
    await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    await lockDGDs(web3, contracts, bN, participants);
    console.log('locked more dgds in main phase');


    // until here
    await waitFor(((await contracts.daoStorage.readProposalDraftVotingTime.call(proposals[3].id)).toNumber()
      + 6) - getCurrentTimestamp(), addressOf, web3);


    // claim the voting, assert that its the same quarter
    await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    await claimDraftVotingResult(contracts);
    console.log('claimed draft voting result');

    // PRL approves these proposals
    await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    await prlApproveProposals(contracts, bN(0), addressOf); // approve first milestone prl
    console.log('prl approved the proposals');

    // first voting round
    await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);
    await votingCommitRound(contracts, addressOf);
    console.log('commit voting has been done');
    await votingRevealRound(contracts, addressOf, { v: votes, s: salts });
    console.log('revealed the committed votes');

    // claim the result of the voting round
    await claimVotingResult(contracts, addressOf);
    console.log('claimed voting result');

    // proposers claim the funding for first milestone
    await claimFunding(contracts, 0);
    console.log('ETH funding has been claimed by the proposer');

    // wait for the quarter to end
    await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE, quarters.QUARTER_2);
    console.log('in the second quarter (quarterId = 2), locking phase');

    // call the global rewards calculation
    await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(20 * (10 ** 9)));
    console.log('transferred dgx to rewards manager');
    await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter({ from: addressOf.founderBadgeHolder });
    console.log('updated the rewards for previous quarter (quarterId = 1)');

    console.log('\t\t#### Info of users for last quarter: ');
    const printStake = async (user, userString) => {
      console.log(`DGDstake of ${userString} = `, await contracts.daoStakeStorage.lockedDGDStake.call(user));
      console.log(`Badge QP of ${userString}= `, await contracts.daoPointsStorage.getQuarterModeratorPoint.call(user, bN(1)));
      console.log(`effectiveDGDBalance of ${userString} = `, await contracts.daoRewardsManager.getUserEffectiveDGDBalanceLastQuarter.call(user));
      console.log(`effective moderator dgd balance of ${userString} = `, await contracts.daoRewardsManager.getUserEffectiveModeratorBalanceLastQuarter.call(user));
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
      console.log(`Badge QP of ${userString}= `, await contracts.daoPointsStorage.getQuarterModeratorPoint.call(user, bN(1)));
      console.log(`RP of ${userString}= `, await contracts.daoPointsStorage.getReputation.call(user));
      console.log();
    };


    await printPoints(addressOf.badgeHolders[0], 'addressOf.badgeHolders[0]');
    await printPoints(addressOf.badgeHolders[1], 'addressOf.badgeHolders[1]');
    await printPoints(addressOf.badgeHolders[2], 'addressOf.badgeHolders[2]');
    await printPoints(addressOf.badgeHolders[3], 'addressOf.badgeHolders[3]');
    await claimDGXs(contracts, addressOf);
    console.log('claimed all dgxs');

    await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_2, web3);
    console.log('in the second quarter (quarterId = 2), main phase');

    // create some fake proposals to draft vote on

    await interimVotingCommitRound(contracts, addressOf);
    console.log('done with interim voting commit round');

    await interimVotingRevealRound(contracts, addressOf);
    console.log('done with interim voting reveal round');

    await waitForRevealPhaseToGetOver(contracts, addressOf, proposals[0].id, bN(1), bN, web3);
    console.log('done waitForRevealPhaseToGetOver');
    await interimVotingRoundClaim(contracts);
    console.log('done with claiming interim round voting');

    prlApproveProposals(contracts, bN(1), addressOf); // approve second milestone funding

    await claimFunding(contracts, 1);
    console.log('claimed funding after interim voting phase');

    await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE, quarters.QUARTER_3, web3);
    console.log('in the third quarter (quarterId = 3), locking phase');

    await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(25 * (10 ** 9)));
    console.log('transferred dgx to rewards manager');
    await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter({ from: addressOf.founderBadgeHolder });
    console.log('updated the rewards for previous quarter (quarterId = 2)');

    await confirmContinuedParticipation(contracts, addressOf);
    console.log('confirmed participation of all members');

    await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_3, web3);
    console.log('in the main phase, now going for interim voting after last milestone');

    await interimCommitRound(contracts, addressOf, 0, bN(2));
    await waitForRevealPhase(contracts, addressOf, proposals[0].id, bN(2), bN, web3);
    await interimRevealRound(contracts, addressOf, 0, bN(2));
    await waitForRevealPhaseToGetOver(contracts, addressOf, proposals[0].id, bN(2), bN, web3);

    console.log('[before claiming result] claimable Eth of proposer = ', await contracts.daoFundingStorage.claimableEth.call(proposals[0].proposer));
    console.log('daoFunding balance = ', await web3.eth.getBalance(contracts.daoFundingManager.address));

    await contracts.daoVotingClaims.claimInterimVotingResult(proposals[0].id, bN(2), { from: proposals[0].proposer });
    console.log('claimed final voting round');

    console.log('before claimFinalReward');
    await printProposalDetails(contracts, proposals[0]);

    await contracts.dao.updatePRL(proposals[0].id, bN(2), true, { from: addressOf.prl });

    console.log('claiming final rewards...');
    await claimFinalReward(contracts, addressOf, proposals[0].id, proposals[0].proposer, 2);
    console.log('claimed final rewards');

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
    await contracts.dao.startSpecialProposalVoting(specialProposalId, getCurrentTimestamp(), { from: addressOf.founderBadgeHolder });
    await waitFor(2, addressOf, web3); // wait for a couple of seconds
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
