const a = require('awaiting');

const {
  randomBytes32,
  randomBytes32s,
  randomAddress,
  randomAddresses,
  randomBigNumbers,
  randomBigNumber,
  zeroAddress,
  timeIsRecent,
  indexRange,
} = require('@digix/helpers/lib/helpers');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  registerInteractive,
  getAllParticipantAddresses,
} = require('../setup');

const {
  proposalStates,
  timeLags,
  sampleBadgeWeights,
  sampleStakeWeights,
  EMPTY_BYTES,
} = require('../daoHelpers');

const bN = web3.toBigNumber;

// proposal 1
const doc = randomBytes32();
const proposer = randomAddress();
const durations = [bN(35), bN(45), bN(55)];
const fundings = [bN(100), bN(200), bN(50)];
const finalReward = bN(2);
// proposal 1 - version 2
const newDoc = randomBytes32();
const newDurations = [bN(40), bN(50), bN(60)];
const newFundings = [bN(350), bN(400), bN(250)];
const newFinalReward = bN(3);
// proposals 2, 3, 4, 5
const someDocs = randomBytes32s(4);
const someProposers = randomAddresses(4);
const someDurations = [[bN(10), bN(15), bN(20)], [bN(35), bN(5), bN(20)], [bN(20), bN(35), bN(40)], [bN(20), bN(35), bN(30)]];
const someFundings = [[bN(100), bN(150), bN(200)], [bN(350), bN(50), bN(200)], [bN(200), bN(350), bN(400)], [bN(200), bN(350), bN(300)]];
const someEndorsers = randomAddresses(2);
const someFinalRewards = randomBigNumbers(bN, 4);

contract('DaoStorage', function (accounts) {
  let libs;
  let addressOf;
  let contracts;
  let badgeWeightOf;
  let stakeWeightOf;

  before(async function () {
    contracts = {};
    libs = {};
    addressOf = {};
    await deployLibraries(libs);
    await deployNewContractResolver(contracts);
    await getAccountsAndAddressOf(accounts, addressOf);
    await deployStorage(libs, contracts, contracts.resolver, addressOf);
    await registerInteractive(contracts.resolver, addressOf);
    badgeWeightOf = sampleBadgeWeights(bN);
    stakeWeightOf = sampleStakeWeights(bN);
  });

  const addEndorsePassSomeProposals = async function () {
    for (const i of indexRange(0, 4)) {
      await contracts.daoStorage.addProposal(someDocs[i], someProposers[i], someDurations[i], someFundings[i], someFinalRewards[i]);
    }
    await contracts.daoStorage.updateProposalEndorse(someDocs[0], someEndorsers[0]);
    await contracts.daoStorage.updateProposalEndorse(someDocs[1], someEndorsers[1]);
    await contracts.daoStorage.setProposalDraftPass(someDocs[0], true);
  };

  describe('addProposal', function () {
    it('[not called by CONTRACT_DAO]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.addProposal.call(
        doc,
        proposer,
        durations,
        fundings,
        finalReward,
        { from: accounts[1] },
      )));
    });
    it('[new proposal]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStorage.addProposal.call(
        doc,
        proposer,
        durations,
        fundings,
        finalReward,
      ), true);
      await contracts.daoStorage.addProposal(doc, proposer, durations, fundings, finalReward);

      const readProposalRes = await contracts.daoStorage.readProposal.call(doc);
      assert.deepEqual(readProposalRes[0], doc);
      assert.deepEqual(readProposalRes[1], proposer);
      assert.deepEqual(readProposalRes[2], zeroAddress);
      assert.deepEqual(readProposalRes[3], proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL);
      assert.deepEqual(timeIsRecent(readProposalRes[4], timeLags().ONE_SECOND_TIME_LAG), true);
      assert.deepEqual(readProposalRes[5], bN(1));
      assert.deepEqual(readProposalRes[6], doc);

      assert.deepEqual(await contracts.daoStorage.getFirstProposal.call(), doc);
      assert.deepEqual(await contracts.daoStorage.getLastProposal.call(), doc);
      assert.deepEqual(await contracts.daoStorage.getNextProposal.call(doc), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposal.call(doc), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalVersion.call(doc), doc);
      assert.deepEqual(await contracts.daoStorage.getLastProposalVersion.call(doc), doc);
      assert.deepEqual(await contracts.daoStorage.getNextProposalVersion.call(doc, doc), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalVersion.call(doc, doc), EMPTY_BYTES);

      const readProposalVersionRes = await contracts.daoStorage.readProposalVersion.call(doc, doc);
      assert.deepEqual(readProposalVersionRes[0], doc);
      assert.deepEqual(timeIsRecent(readProposalVersionRes[1], timeLags().ONE_SECOND_TIME_LAG), true);
      assert.deepEqual(readProposalVersionRes[2][0], durations[0]);
      assert.deepEqual(readProposalVersionRes[2][1], durations[1]);
      assert.deepEqual(readProposalVersionRes[2][2], durations[2]);
      assert.deepEqual(readProposalVersionRes[3][0], fundings[0]);
      assert.deepEqual(readProposalVersionRes[3][1], fundings[1]);
      assert.deepEqual(readProposalVersionRes[3][2], fundings[2]);
      assert.deepEqual(readProposalVersionRes[4], finalReward);
    });
  });

  describe('editProposal', function () {
    it('[modify proposal]: verify versions', async function () {
      assert.deepEqual(await contracts.daoStorage.editProposal.call(
        doc,
        newDoc,
        newDurations,
        newFundings,
        newFinalReward,
      ), true);
      await contracts.daoStorage.editProposal(doc, newDoc, newDurations, newFundings, newFinalReward);

      assert.deepEqual(await contracts.daoStorage.getFirstProposalVersion.call(doc), doc);
      assert.deepEqual(await contracts.daoStorage.getLastProposalVersion.call(doc), newDoc);
      assert.deepEqual(await contracts.daoStorage.getNextProposalVersion.call(doc, doc), newDoc);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalVersion.call(doc, newDoc), doc);
      assert.deepEqual(await contracts.daoStorage.getNextProposalVersion.call(doc, newDoc), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalVersion.call(doc, doc), EMPTY_BYTES);

      const readProposalVersionRes = await contracts.daoStorage.readProposalVersion.call(doc, newDoc);
      assert.deepEqual(readProposalVersionRes[0], newDoc);
      assert.deepEqual(timeIsRecent(readProposalVersionRes[1], timeLags().ONE_SECOND_TIME_LAG), true);
      assert.deepEqual(readProposalVersionRes[2][0], newDurations[0]);
      assert.deepEqual(readProposalVersionRes[2][1], newDurations[1]);
      assert.deepEqual(readProposalVersionRes[2][2], newDurations[2]);
      assert.deepEqual(readProposalVersionRes[3][0], newFundings[0]);
      assert.deepEqual(readProposalVersionRes[3][1], newFundings[1]);
      assert.deepEqual(readProposalVersionRes[3][2], newFundings[2]);
      assert.deepEqual(readProposalVersionRes[4], newFinalReward);

      const allUsers = [addressOf.badgeHolders[0], addressOf.badgeHolders[1], addressOf.badgeHolders[2], addressOf.badgeHolders[3],
        addressOf.dgdHolders[0], addressOf.dgdHolders[1], addressOf.dgdHolders[2], addressOf.dgdHolders[3],
        addressOf.dgdHolders[4], addressOf.dgdHolders[5]];
      const voting = await contracts.daoStorage.readDraftVotingCount.call(doc, allUsers);
      assert.deepEqual(voting[0], bN(0));
      assert.deepEqual(voting[1], bN(0));
      assert.deepEqual(voting[2], bN(0));
    });
    it('[not called by CONTRACT_DAO]: revert', async function () {
      const anotherDoc = randomBytes32();
      const anotherDurations = [bN(100)];
      const anotherFundings = [bN(100)];
      const anotherFinalReward = bN(4);
      assert(await a.failure(contracts.daoStorage.editProposal.call(
        anotherDoc,
        proposer,
        anotherDurations,
        anotherFundings,
        anotherFinalReward,
        { from: accounts[2] },
      )));
    });
  });

  describe('finalizeProposal', function () {
    it('[not called by CONTRACT_DAO]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.finalizeProposal.call(
        doc,
        { from: accounts[3] },
      )));
    });
    it('[finalize proposal valid]: success, read functions', async function () {
      // since final version is not set, milestone values will all be zero
      const milestoneInfoBefore = await contracts.daoStorage.readProposalMilestone.call(doc, bN(0));
      assert.deepEqual(await contracts.daoStorage.readFinalVersion.call(doc), EMPTY_BYTES);
      await contracts.daoStorage.finalizeProposal(doc, { from: accounts[0] });
      assert.deepEqual(await contracts.daoStorage.readFinalVersion.call(doc), newDoc);
      const milestoneInfoAfter = await contracts.daoStorage.readProposalMilestone.call(doc, bN(0));
      assert.deepEqual(milestoneInfoBefore[1], bN(0));
      assert.deepEqual(milestoneInfoBefore[2], bN(0));
      assert.deepEqual(milestoneInfoBefore[3], bN(0));
      assert.deepEqual(milestoneInfoAfter[1], newDurations[0]);
      assert.deepEqual(milestoneInfoAfter[2], newFundings[0]);
    });
  });

  describe('updateProposalEndorse', function () {
    const endorser = randomAddress();
    it('[not called by CONTRACT_DAO]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.updateProposalEndorse.call(
        doc,
        endorser,
        { from: accounts[3] },
      )));
    });
    it('[endorse proposal]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL), doc);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates(bN).PROPOSAL_STATE_INITIAL), EMPTY_BYTES);

      assert.deepEqual(await contracts.daoStorage.updateProposalEndorse.call(
        doc,
        endorser,
      ), true);
      await contracts.daoStorage.updateProposalEndorse(doc, endorser);

      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates(bN).PROPOSAL_STATE_INITIAL), doc);
      assert.deepEqual(await contracts.daoStorage.readProposalState.call(doc), proposalStates(bN).PROPOSAL_STATE_INITIAL);
    });
  });

  describe('Read Functions', function () {
    before(async function () {
      await addEndorsePassSomeProposals();
    });
    it('getFirstProposal', async function () {
      assert.deepEqual(await contracts.daoStorage.getFirstProposal.call(), doc);
    });
    it('getLastProposal', async function () {
      assert.deepEqual(await contracts.daoStorage.getLastProposal.call(), someDocs[3]);
    });
    it('getNextProposal', async function () {
      assert.deepEqual(await contracts.daoStorage.getNextProposal.call(doc), someDocs[0]);
      assert.deepEqual(await contracts.daoStorage.getNextProposal.call(someDocs[0]), someDocs[1]);
      assert.deepEqual(await contracts.daoStorage.getNextProposal.call(someDocs[1]), someDocs[2]);
      assert.deepEqual(await contracts.daoStorage.getNextProposal.call(someDocs[2]), someDocs[3]);
      assert.deepEqual(await contracts.daoStorage.getNextProposal.call(someDocs[3]), EMPTY_BYTES);
    });
    it('getPreviousProposal', async function () {
      assert.deepEqual(await contracts.daoStorage.getPreviousProposal.call(doc), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposal.call(someDocs[0]), doc);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposal.call(someDocs[1]), someDocs[0]);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposal.call(someDocs[2]), someDocs[1]);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposal.call(someDocs[3]), someDocs[2]);
    });
    it('getFirstProposalInState', async function () {
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL), someDocs[2]);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates(bN).PROPOSAL_STATE_INITIAL), doc);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates(bN).PROPOSAL_STATE_VETTED), someDocs[0]);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates(bN).PROPOSAL_STATE_FUNDED), EMPTY_BYTES);
    });
    it('getLastProposalInState', async function () {
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL), someDocs[3]);
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates(bN).PROPOSAL_STATE_INITIAL), someDocs[1]);
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates(bN).PROPOSAL_STATE_VETTED), someDocs[0]);
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates(bN).PROPOSAL_STATE_FUNDED), EMPTY_BYTES);
    });
    it('getNextProposalInState', async function () {
      assert.deepEqual(await contracts.daoStorage.getNextProposalInState.call(proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL, someDocs[2]), someDocs[3]);
      assert.deepEqual(await contracts.daoStorage.getNextProposalInState.call(proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL, someDocs[3]), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getNextProposalInState.call(proposalStates(bN).PROPOSAL_STATE_INITIAL, doc), someDocs[1]);
      assert.deepEqual(await contracts.daoStorage.getNextProposalInState.call(proposalStates(bN).PROPOSAL_STATE_INITIAL, someDocs[1]), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getNextProposalInState.call(proposalStates(bN).PROPOSAL_STATE_VETTED, someDocs[0]), EMPTY_BYTES);
    });
    it('getPreviousProposalInState', async function () {
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalInState.call(proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL, someDocs[2]), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalInState.call(proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL, someDocs[3]), someDocs[2]);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalInState.call(proposalStates(bN).PROPOSAL_STATE_INITIAL, doc), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalInState.call(proposalStates(bN).PROPOSAL_STATE_INITIAL, someDocs[1]), doc);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalInState.call(proposalStates(bN).PROPOSAL_STATE_VETTED, someDocs[0]), EMPTY_BYTES);
    });
  });

  describe('addDraftVote', function () {
    it('[not called by CONTRACT_DAO_VOTING]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.addDraftVote.call(
        doc,
        addressOf.badgeHolders[0],
        true,
        badgeWeightOf[0],
        bN(1),
        { from: accounts[4] },
      )));
    });
    it('[add votes]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStorage.addDraftVote.call(
        doc,
        addressOf.badgeHolders[0],
        true,
        badgeWeightOf[0],
      ), true);
      // badgeHolder1, badgeHolder3 and badgeHolder4 vote for
      // badgeHolder3 votes against
      await contracts.daoStorage.addDraftVote(
        doc, addressOf.badgeHolders[0],
        true, badgeWeightOf[0],
      );
      await contracts.daoStorage.addDraftVote(
        doc, addressOf.badgeHolders[1],
        false, badgeWeightOf[1],
      );
      await contracts.daoStorage.addDraftVote(
        doc, addressOf.badgeHolders[2],
        true, badgeWeightOf[2],
      );
      await contracts.daoStorage.addDraftVote(
        doc, addressOf.badgeHolders[3],
        true, badgeWeightOf[3],
      );

      const readDraftVotingCountRes = await contracts.daoStorage.readDraftVotingCount.call(
        doc,
        [addressOf.badgeHolders[0], addressOf.badgeHolders[1], addressOf.badgeHolders[2], addressOf.badgeHolders[3]],
      );
      const forWeight = badgeWeightOf[0].plus(badgeWeightOf[2]).plus(badgeWeightOf[3]);
      const againstWeight = badgeWeightOf[1];
      assert.deepEqual(readDraftVotingCountRes[0], forWeight);
      assert.deepEqual(readDraftVotingCountRes[1], againstWeight);
      assert.deepEqual(readDraftVotingCountRes[2], forWeight.plus(againstWeight));
    });
    it('[edit votes]: verify read functions', async function () {
      // badgeHolder3 changes vote to false
      // badgeHolder4 votes again with updated weight
      await contracts.daoStorage.addDraftVote(
        doc, addressOf.badgeHolders[2],
        false, badgeWeightOf[2],
      );
      await contracts.daoStorage.addDraftVote(
        doc, addressOf.badgeHolders[3],
        true, badgeWeightOf[3].plus(bN(1)),
      );
      const readDraftVotingCountRes = await contracts.daoStorage.readDraftVotingCount.call(
        doc,
        [addressOf.badgeHolders[0], addressOf.badgeHolders[1], addressOf.badgeHolders[2], addressOf.badgeHolders[3]],
      );
      const forWeight = badgeWeightOf[0].plus(badgeWeightOf[3]).plus(bN(1));
      const againstWeight = badgeWeightOf[1].plus(badgeWeightOf[2]);
      assert.deepEqual(readDraftVotingCountRes[0], forWeight);
      assert.deepEqual(readDraftVotingCountRes[1], againstWeight);
      assert.deepEqual(readDraftVotingCountRes[2], forWeight.plus(againstWeight));
    });
  });

  describe('updateProposalPRL', function () {
    it('[not called by CONTRACT_DAO]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.updateProposalPRL.call(
        doc,
        bN(0),
        false,
        { from: accounts[5] },
      )));
    });
    it('[pass the PRL]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStorage.readProposalPRL.call(doc, bN(0)), false);
      await contracts.daoStorage.updateProposalPRL(doc, bN(0), true);
      assert.deepEqual(await contracts.daoStorage.readProposalPRL.call(doc, bN(0)), true);
      assert.deepEqual(await contracts.daoStorage.readProposalPRL.call(doc, bN(1)), false);
    });
  });

  describe('setProposalDraftPass', function () {
    // proposal 1, i.e. `doc` is in PROPOSAL_STATE_INITIAL state
    // draft pass it
    it('[not called by CONTRACT_DAO_VOTING_CLAIMS]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.setProposalDraftPass.call(
        doc,
        true,
        { from: accounts[2] },
      )));
    });
    it('[draft pass proposal]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStorage.setProposalDraftPass.call(
        doc,
        true,
      ), true);
      await contracts.daoStorage.setProposalDraftPass(doc, true);

      // read state of doc
      assert.deepEqual(await contracts.daoStorage.readProposalState.call(doc), proposalStates(bN).PROPOSAL_STATE_VETTED);
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates(bN).PROPOSAL_STATE_VETTED), doc);
      // read draft voting result
      assert.deepEqual(await contracts.daoStorage.readProposalDraftVotingResult.call(doc), true);
    });
  });

  describe('setProposalVotingTime', function () {
    const randomTime = randomBigNumber(bN);
    it('[not called by CONTRACT_DAO_VOTING_CLAIMS]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.setProposalVotingTime.call(
        doc,
        bN(0),
        randomTime,
        { from: accounts[3] },
      )));
    });
    it('[valid call]: read function', async function () {
      await contracts.daoStorage.setProposalVotingTime(
        doc,
        bN(0),
        randomTime,
        { from: accounts[0] },
      );
      assert.deepEqual(await contracts.daoStorage.readProposalVotingTime.call(doc, bN(0)), randomTime);
    });
    it('[valid call interim]: read function', async function () {
      const someTime = randomBigNumber(bN);
      const someTime2 = randomBigNumber(bN);
      await contracts.daoStorage.setProposalVotingTime(
        doc,
        bN(1),
        someTime,
      );
      await contracts.daoStorage.setProposalVotingTime(
        doc,
        bN(2),
        someTime2,
      );
      assert.deepEqual(await contracts.daoStorage.readProposalVotingTime.call(doc, bN(1)), someTime);
      assert.deepEqual(await contracts.daoStorage.readProposalVotingTime.call(doc, bN(2)), someTime2);
    });
  });

  describe('commitVote', function () {
    it('[not called by CONTRACT_DAO_VOTING]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.commitVote.call(
        doc,
        randomBytes32(),
        randomAddress(),
        bN(0),
        bN(1),
        { from: accounts[6] },
      )));
    });
    it('[commit votes]: verify read functions', async function () {
      // badgeHolder1 commits vote 2 times
      const randomCommits = randomBytes32s(10);
      assert.deepEqual(await contracts.daoStorage.commitVote.call(
        doc,
        randomCommits[0],
        addressOf.badgeHolders[0],
        bN(0),
      ), true);
      await contracts.daoStorage.commitVote(
        doc, randomCommits[0],
        addressOf.badgeHolders[0], bN(0),
      );
      await contracts.daoStorage.commitVote(
        doc, randomCommits[1],
        addressOf.badgeHolders[0], bN(0),
      );
      // dgdHolder1 commits vote
      await contracts.daoStorage.commitVote(
        doc, randomCommits[2],
        addressOf.dgdHolders[0], bN(0),
      );
      await contracts.daoStorage.commitVote(
        doc, randomCommits[3],
        addressOf.dgdHolders[1], bN(0),
      );
      // verify commit votes
      assert.deepEqual(await contracts.daoStorage.readCommitVote.call(doc, bN(0), addressOf.badgeHolders[0]), randomCommits[1]);
      assert.deepEqual(await contracts.daoStorage.readCommitVote.call(doc, bN(0), addressOf.dgdHolders[0]), randomCommits[2]);
      assert.deepEqual(await contracts.daoStorage.readCommitVote.call(doc, bN(0), addressOf.dgdHolders[1]), randomCommits[3]);

      await contracts.daoStorage.commitVote(
        doc, randomCommits[6],
        addressOf.dgdHolders[1], bN(1),
      );
      // verify commit votes
      assert.deepEqual(await contracts.daoStorage.readCommitVote.call(doc, bN(1), addressOf.dgdHolders[1]), randomCommits[6]);
    });
  });

  describe('revealVote', function () {
    it('[not called by CONTRACT_DAO_VOTING]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.revealVote.call(
        doc,
        addressOf.badgeHolders[0],
        true,
        stakeWeightOf[0],
        bN(0),
        { from: accounts[7] },
      )));
    });
    it('[reveal the committed votes]: verify read/calculate functions', async function () {
      assert.deepEqual(await contracts.daoStorage.revealVote.call(
        doc,
        addressOf.badgeHolders[0],
        true,
        stakeWeightOf[0],
        bN(0),
      ), true);
      await contracts.daoStorage.revealVote(doc, addressOf.badgeHolders[0], true, stakeWeightOf[0], bN(0));
      await contracts.daoStorage.revealVote(doc, addressOf.dgdHolders[0], true, stakeWeightOf[4], bN(0));
      await contracts.daoStorage.revealVote(doc, addressOf.dgdHolders[1], false, stakeWeightOf[5], bN(0));
      const forWeight = stakeWeightOf[0].plus(stakeWeightOf[4]);
      const againstWeight = stakeWeightOf[5];
      // read voting counts
      const readVotingCountRes = await contracts.daoStorage.readVotingCount.call(doc, bN(0), getAllParticipantAddresses(accounts));
      assert.deepEqual(readVotingCountRes[0], forWeight);
      assert.deepEqual(readVotingCountRes[1], againstWeight);

      // read list of yes votes
      const yesVotes = await contracts.daoStorage.readVotingRoundVotes.call(doc, bN(0), getAllParticipantAddresses(accounts), true);
      const noVotes = await contracts.daoStorage.readVotingRoundVotes.call(doc, bN(0), getAllParticipantAddresses(accounts), false);
      assert.equal(yesVotes[1].toNumber(), 2);
      assert.equal(noVotes[1].toNumber(), 1);

      assert.deepEqual(await contracts.daoStorage.readVote.call(doc, bN(0), addressOf.badgeHolders[0]), stakeWeightOf[0]);
      assert.deepEqual(await contracts.daoStorage.readVote.call(doc, bN(0), addressOf.dgdHolders[0]), stakeWeightOf[4]);
    });
  });

  describe('setProposalPass', function () {
    it('[not called by CONTRACT_DAO_VOTING_CLAIMS]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.setProposalPass.call(
        doc,
        bN(0),
        true,
        { from: accounts[4] },
      )));
    });
    it('[pass proposal]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStorage.setProposalPass.call(
        doc,
        bN(0),
        true,
      ), true);
      await contracts.daoStorage.setProposalPass(doc, bN(0), true);
      // verify state of the proposal
      assert.deepEqual(await contracts.daoStorage.readProposalState.call(doc), proposalStates(bN).PROPOSAL_STATE_FUNDED);
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates(bN).PROPOSAL_STATE_FUNDED), doc);
      // verify if proposal voting is passed
      assert.deepEqual(await contracts.daoStorage.readProposalVotingResult.call(doc, bN(0)), true);
    });
  });
});
