const a = require('awaiting');

const {
  paddedHex,
  randomBytes32,
  randomBytes32s,
  randomAddress,
  randomAddresses,
  randomBigNumbers,
  randomBigNumber,
  zeroAddress,
  timeIsRecent,
  indexRange,
  getCurrentTimestamp,
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
const fundings = [bN(100), bN(200), bN(50)];
const finalReward = bN(2);
// proposal 1 - version 2
const newDoc = randomBytes32();
const newFundings = [bN(350), bN(400), bN(250)];
const newFinalReward = bN(3);
// proposals 2, 3, 4, 5
const someDocs = randomBytes32s(5);
const someProposers = randomAddresses(5);
const someFundings = [[bN(100), bN(150), bN(200)], [bN(350), bN(50), bN(200)], [bN(200), bN(350), bN(400)], [bN(200), bN(350), bN(300)], [bN(200), bN(350), bN(300)]];
const someEndorsers = randomAddresses(2);
const someFinalRewards = randomBigNumbers(bN, 5);

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
      await contracts.daoStorage.addProposal(someDocs[i], someProposers[i], someFundings[i], someFinalRewards[i], false);
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
        fundings,
        finalReward,
        false,
        { from: accounts[1] },
      )));
    });
    it('[new proposal]: verify read functions', async function () {
      assert.ok(await contracts.daoStorage.addProposal.call(
        doc,
        proposer,
        fundings,
        finalReward,
        false,
      ));
      await contracts.daoStorage.addProposal(doc, proposer, fundings, finalReward, false);

      const readProposalRes = await contracts.daoStorage.readProposal.call(doc);
      assert.deepEqual(readProposalRes[0], doc);
      assert.deepEqual(readProposalRes[1], proposer);
      assert.deepEqual(readProposalRes[2], zeroAddress);
      assert.deepEqual(readProposalRes[3], paddedHex(web3, proposalStates().PROPOSAL_STATE_PREPROPOSAL));
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
      assert.deepEqual(readProposalVersionRes[2][0], fundings[0]);
      assert.deepEqual(readProposalVersionRes[2][1], fundings[1]);
      assert.deepEqual(readProposalVersionRes[2][2], fundings[2]);
      assert.deepEqual(readProposalVersionRes[3], finalReward);
    });
    it('[create new proposal with 0x0 proposalId]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.addProposal.call(
        '0x0',
        proposer,
        fundings,
        finalReward,
        false,
      )));
    });
    it('[create new proposal with same ID/try to overwrite a proposal]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.addProposal.call(
        doc,
        proposer,
        fundings,
        finalReward,
        false,
      )));
    });
  });

  describe('editProposal', function () {
    it('[modify proposal]: verify versions', async function () {
      assert.ok(await contracts.daoStorage.editProposal.call(
        doc,
        newDoc,
        newFundings,
        newFinalReward,
      ));
      await contracts.daoStorage.editProposal(doc, newDoc, newFundings, newFinalReward);

      assert.deepEqual(await contracts.daoStorage.getFirstProposalVersion.call(doc), doc);
      assert.deepEqual(await contracts.daoStorage.getLastProposalVersion.call(doc), newDoc);
      assert.deepEqual(await contracts.daoStorage.getNextProposalVersion.call(doc, doc), newDoc);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalVersion.call(doc, newDoc), doc);
      assert.deepEqual(await contracts.daoStorage.getNextProposalVersion.call(doc, newDoc), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalVersion.call(doc, doc), EMPTY_BYTES);

      const readProposalVersionRes = await contracts.daoStorage.readProposalVersion.call(doc, newDoc);
      assert.deepEqual(readProposalVersionRes[0], newDoc);
      assert.deepEqual(timeIsRecent(readProposalVersionRes[1], timeLags().ONE_SECOND_TIME_LAG), true);
      assert.deepEqual(readProposalVersionRes[2][0], newFundings[0]);
      assert.deepEqual(readProposalVersionRes[2][1], newFundings[1]);
      assert.deepEqual(readProposalVersionRes[2][2], newFundings[2]);
      assert.deepEqual(readProposalVersionRes[3], newFinalReward);
    });
    it('[not called by CONTRACT_DAO]: revert', async function () {
      const anotherDoc = randomBytes32();
      const anotherFundings = [bN(100)];
      const anotherFinalReward = bN(4);
      assert(await a.failure(contracts.daoStorage.editProposal.call(
        anotherDoc,
        proposer,
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
    it('[Before finalized, tries to readProposalMilestone]: revert', async function () {
      // since final version is not set, milestone values will all be zero
      assert.ok(await a.failure(contracts.daoStorage.readProposalMilestone.call(doc, bN(0))));
    });
    it('[finalize proposal valid]: success, read functions', async function () {
      const finalVersionBefore = (await contracts.daoStorage.readProposal.call(doc))[7];
      assert.deepEqual(finalVersionBefore, EMPTY_BYTES);
      await contracts.daoStorage.finalizeProposal(doc, { from: accounts[0] });
      const finalVersionAfter = (await contracts.daoStorage.readProposal.call(doc))[7];
      assert.deepEqual(finalVersionAfter, newDoc);
      const milestoneInfoAfter = await contracts.daoStorage.readProposalMilestone.call(doc, bN(0));
      assert.deepEqual(milestoneInfoAfter, newFundings[0]);
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
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_PREPROPOSAL), doc);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_DRAFT), EMPTY_BYTES);

      assert.ok(await contracts.daoStorage.updateProposalEndorse.call(
        doc,
        endorser,
      ));
      await contracts.daoStorage.updateProposalEndorse(doc, endorser);

      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_PREPROPOSAL), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_DRAFT), doc);
      const readProposal = await contracts.daoStorage.readProposal.call(doc);
      const stateAfter = readProposal[3];
      const proposalEndorser = readProposal[2];
      assert.deepEqual(stateAfter, paddedHex(web3, proposalStates().PROPOSAL_STATE_DRAFT));
      assert.deepEqual(proposalEndorser, endorser);
    });
  });

  describe('updateProposalPRL', function () {
    before(async function () {
      await contracts.daoStorage.addProposal(someDocs[4], someProposers[4], someFundings[4], someFinalRewards[4], false);
    });
    it('[not called by CONTRACT_DAO]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.updateProposalPRL.call(
        someDocs[4],
        bN(1),
        randomBytes32(),
        bN(getCurrentTimestamp()),
        { from: accounts[5] },
      )));
    });
    it('[pause the proposal]: verify read functions', async function () {
      const prlDoc = randomBytes32();
      await contracts.daoStorage.updateProposalPRL(
        someDocs[4],
        bN(2),
        prlDoc,
        bN(getCurrentTimestamp()),
      );
      const readProposal = await contracts.daoStorage.readProposal.call(someDocs[4]);
      const isPaused = readProposal[8];
      assert.deepEqual(isPaused, true);
      const action = await contracts.daoStorage.readPrlAction.call(someDocs[4], bN(0));
      assert.deepEqual(action[0], bN(2));
      assert.deepEqual(timeIsRecent(action[1], 2), true);
      assert.deepEqual(action[2], prlDoc);
    });
    it('[unpause the proposal]', async function () {
      const prlDoc = randomBytes32();
      await contracts.daoStorage.updateProposalPRL(
        someDocs[4],
        bN(3),
        prlDoc,
        bN(getCurrentTimestamp()),
      );
      const readProposal = await contracts.daoStorage.readProposal.call(someDocs[4]);
      const isPaused = readProposal[8];
      assert.deepEqual(isPaused, false);
      const action = await contracts.daoStorage.readPrlAction.call(someDocs[4], bN(1));
      assert.deepEqual(action[0], bN(3));
      assert.deepEqual(timeIsRecent(action[1], 2), true);
      assert.deepEqual(action[2], prlDoc);
    });
    it('[stop the proposal]', async function () {
      const prlDoc = randomBytes32();
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates().PROPOSAL_STATE_PREPROPOSAL), someDocs[4]);
      await contracts.daoStorage.updateProposalPRL(
        someDocs[4],
        bN(1),
        prlDoc,
        bN(getCurrentTimestamp()),
      );
      const readProposal = await contracts.daoStorage.readProposal.call(someDocs[4]);
      const isPaused = readProposal[8];
      const state = readProposal[3];
      assert.deepEqual(isPaused, true);
      assert.deepEqual(state, paddedHex(web3, proposalStates().PROPOSAL_STATE_CLOSED));
      assert.notEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates().PROPOSAL_STATE_PREPROPOSAL), someDocs[4]);
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates().PROPOSAL_STATE_CLOSED), someDocs[4]);
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
      assert.deepEqual(await contracts.daoStorage.getNextProposal.call(doc), someDocs[4]);
      assert.deepEqual(await contracts.daoStorage.getNextProposal.call(someDocs[4]), someDocs[0]);
      assert.deepEqual(await contracts.daoStorage.getNextProposal.call(someDocs[0]), someDocs[1]);
      assert.deepEqual(await contracts.daoStorage.getNextProposal.call(someDocs[1]), someDocs[2]);
      assert.deepEqual(await contracts.daoStorage.getNextProposal.call(someDocs[2]), someDocs[3]);
      assert.deepEqual(await contracts.daoStorage.getNextProposal.call(someDocs[3]), EMPTY_BYTES);
    });
    it('getPreviousProposal', async function () {
      assert.deepEqual(await contracts.daoStorage.getPreviousProposal.call(doc), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposal.call(someDocs[1]), someDocs[0]);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposal.call(someDocs[2]), someDocs[1]);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposal.call(someDocs[3]), someDocs[2]);
    });
    it('getFirstProposalInState', async function () {
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_PREPROPOSAL), someDocs[2]);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_DRAFT), doc);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_MODERATED), someDocs[0]);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_ONGOING), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_CLOSED), someDocs[4]);
    });
    it('getLastProposalInState', async function () {
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates().PROPOSAL_STATE_PREPROPOSAL), someDocs[3]);
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates().PROPOSAL_STATE_DRAFT), someDocs[1]);
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates().PROPOSAL_STATE_MODERATED), someDocs[0]);
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates().PROPOSAL_STATE_ONGOING), EMPTY_BYTES);
    });
    it('getNextProposalInState', async function () {
      assert.deepEqual(await contracts.daoStorage.getNextProposalInState.call(proposalStates().PROPOSAL_STATE_PREPROPOSAL, someDocs[2]), someDocs[3]);
      assert.deepEqual(await contracts.daoStorage.getNextProposalInState.call(proposalStates().PROPOSAL_STATE_PREPROPOSAL, someDocs[3]), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getNextProposalInState.call(proposalStates().PROPOSAL_STATE_DRAFT, doc), someDocs[1]);
      assert.deepEqual(await contracts.daoStorage.getNextProposalInState.call(proposalStates().PROPOSAL_STATE_DRAFT, someDocs[1]), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getNextProposalInState.call(proposalStates().PROPOSAL_STATE_MODERATED, someDocs[0]), EMPTY_BYTES);
    });
    it('getPreviousProposalInState', async function () {
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalInState.call(proposalStates().PROPOSAL_STATE_PREPROPOSAL, someDocs[2]), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalInState.call(proposalStates().PROPOSAL_STATE_PREPROPOSAL, someDocs[3]), someDocs[2]);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalInState.call(proposalStates().PROPOSAL_STATE_DRAFT, doc), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalInState.call(proposalStates().PROPOSAL_STATE_DRAFT, someDocs[1]), doc);
      assert.deepEqual(await contracts.daoStorage.getPreviousProposalInState.call(proposalStates().PROPOSAL_STATE_MODERATED, someDocs[0]), EMPTY_BYTES);
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
      assert.ok(await contracts.daoStorage.addDraftVote.call(
        doc,
        addressOf.badgeHolders[0],
        true,
        badgeWeightOf[0],
      ));
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
    });
  });

  describe('setProposalDraftPass', function () {
    // proposal 1, i.e. `doc` is in PROPOSAL_STATE_DRAFT state
    // draft pass it
    it('[not called by CONTRACT_DAO_VOTING_CLAIMS]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.setProposalDraftPass.call(
        doc,
        true,
        { from: accounts[2] },
      )));
    });
    it('[draft pass proposal]: verify read functions', async function () {
      assert.ok(await contracts.daoStorage.setProposalDraftPass.call(
        doc,
        true,
      ));
      await contracts.daoStorage.setProposalDraftPass(doc, true);

      // read state of doc
      const readProposal = await contracts.daoStorage.readProposal.call(doc);
      const state = readProposal[3];
      assert.deepEqual(state, paddedHex(web3, proposalStates().PROPOSAL_STATE_MODERATED));
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates().PROPOSAL_STATE_MODERATED), doc);
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
      assert.ok(await contracts.daoStorage.commitVote.call(
        doc,
        randomCommits[0],
        addressOf.badgeHolders[0],
        bN(0),
      ));
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
      assert.deepEqual(await contracts.daoStorage.readComittedVote.call(doc, bN(0), addressOf.badgeHolders[0]), randomCommits[1]);
      assert.deepEqual(await contracts.daoStorage.readComittedVote.call(doc, bN(0), addressOf.dgdHolders[0]), randomCommits[2]);
      assert.deepEqual(await contracts.daoStorage.readComittedVote.call(doc, bN(0), addressOf.dgdHolders[1]), randomCommits[3]);

      await contracts.daoStorage.commitVote(
        doc, randomCommits[6],
        addressOf.dgdHolders[1], bN(1),
      );
      // verify commit votes
      assert.deepEqual(await contracts.daoStorage.readComittedVote.call(doc, bN(1), addressOf.dgdHolders[1]), randomCommits[6]);
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
      assert.ok(await contracts.daoStorage.revealVote.call(
        doc,
        addressOf.badgeHolders[0],
        true,
        stakeWeightOf[0],
        bN(0),
      ));
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

      assert.deepEqual((await contracts.daoStorage.readVote.call(doc, bN(0), addressOf.badgeHolders[0]))[1], stakeWeightOf[0]);
      assert.deepEqual((await contracts.daoStorage.readVote.call(doc, bN(0), addressOf.dgdHolders[0]))[1], stakeWeightOf[4]);
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
      assert.ok(await contracts.daoStorage.setProposalPass.call(
        doc,
        bN(0),
        true,
      ));
      await contracts.daoStorage.setProposalPass(doc, bN(0), true);
      // verify state of the proposal
      const readProposal = await contracts.daoStorage.readProposal.call(doc);
      const state = readProposal[3];
      assert.deepEqual(state, paddedHex(web3, proposalStates().PROPOSAL_STATE_ONGOING));
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates().PROPOSAL_STATE_ONGOING), doc);
      // verify if proposal voting is passed
      assert.deepEqual(await contracts.daoStorage.readProposalVotingResult.call(doc, bN(0)), true);
    });
  });

  describe('addNonDigixProposalCountInQuarter', function () {
    it('[not called by CONTRACT_DAO_VOTING_CLAIMS]: revert', async function () {
      assert(await a.failure(contracts.daoProposalCounterStorage.addNonDigixProposalCountInQuarter.call(bN(1), { from: accounts[2] })));
    });
    it('[valid call]: increment the count', async function () {
      assert.deepEqual(await contracts.daoProposalCounterStorage.proposalCountByQuarter.call(bN(1)), bN(0));
      await contracts.daoProposalCounterStorage.addNonDigixProposalCountInQuarter(bN(1));
      assert.deepEqual(await contracts.daoProposalCounterStorage.proposalCountByQuarter.call(bN(1)), bN(1));
      await contracts.daoProposalCounterStorage.addNonDigixProposalCountInQuarter(bN(1));
      await contracts.daoProposalCounterStorage.addNonDigixProposalCountInQuarter(bN(2));
      await contracts.daoProposalCounterStorage.addNonDigixProposalCountInQuarter(bN(2));
      await contracts.daoProposalCounterStorage.addNonDigixProposalCountInQuarter(bN(2));
      assert.deepEqual(await contracts.daoProposalCounterStorage.proposalCountByQuarter.call(bN(1)), bN(2));
      assert.deepEqual(await contracts.daoProposalCounterStorage.proposalCountByQuarter.call(bN(2)), bN(3));
    });
  });

  describe('setProposalCollateralStatus', function () {
    it('[not called by CONTRACT_DAO, CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_FUNDING_MANAGER]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.setProposalCollateralStatus.call(doc, bN(1), { from: accounts[2] })));
    });
    it('[valid call]: readProposalCollateralStatus', async function () {
      await contracts.daoStorage.setProposalCollateralStatus(doc, bN(1));
      assert.deepEqual(await contracts.daoStorage.readProposalCollateralStatus.call(doc), bN(1));
      await contracts.daoStorage.setProposalCollateralStatus(doc, bN(2));
      assert.deepEqual(await contracts.daoStorage.readProposalCollateralStatus.call(doc), bN(2));
      await contracts.daoStorage.setProposalCollateralStatus(doc, bN(3));
      assert.deepEqual(await contracts.daoStorage.readProposalCollateralStatus.call(doc), bN(3));
    });
  });

  describe('closeProposal', function () {
    it('[not called by CONTRACT_DAO]: revert', async function () {
      assert(await a.failure(contracts.daoStorage.closeProposal(someDocs[1], { from: accounts[3] })));
    });
    it('[valid call]: delete proposal', async function () {
      const readProposal0 = await contracts.daoStorage.readProposal.call(doc);
      const initialState = readProposal0[3];
      assert.notEqual(initialState, paddedHex(web3, proposalStates().PROPOSAL_STATE_CLOSED));
      await contracts.daoStorage.closeProposal(doc);

      const readProposal0After = await contracts.daoStorage.readProposal.call(doc);
      assert.deepEqual(readProposal0After[3], paddedHex(web3, proposalStates().PROPOSAL_STATE_CLOSED));

      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates().PROPOSAL_STATE_CLOSED), doc);
    });
  });
});
