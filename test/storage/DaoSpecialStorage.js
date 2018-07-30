const a = require('awaiting');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  registerInteractive,
  assignVotesAndCommits,
} = require('../setup');

const {
  EMPTY_BYTES,
} = require('../daoHelpers');

const {
  randomAddress,
  randomBytes32,
  randomBigNumbers,
  timeIsRecent,
  getCurrentTimestamp,
  indexRange,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

const doc = randomBytes32();
const proposer = randomAddress();
const uintConfigs = randomBigNumbers(bN, 44);
const addressConfigs = [];
const bytesConfigs = [];

contract('DaoSpecialStorage', function (accounts) {
  let libs;
  let addressOf;
  let contracts;
  let votingObj;

  before(async function () {
    contracts = {};
    libs = {};
    addressOf = {};
    await deployLibraries(libs);
    await deployNewContractResolver(contracts);
    await getAccountsAndAddressOf(accounts, addressOf);
    await deployStorage(libs, contracts, contracts.resolver, addressOf);
    await registerInteractive(contracts.resolver, addressOf);
  });

  describe('Initialization', function () {
    it('[contract key]', async function () {
      assert.deepEqual(await contracts.resolver.get_contract.call('storage:dao:special'), contracts.daoSpecialStorage.address);
    });
  });

  describe('addSpecialProposal', function () {
    it('[not called from CONTRACT_DAO]: revert', async function () {
      for (const i of indexRange(1, 20)) {
        assert(await a.failure(contracts.daoSpecialStorage.addSpecialProposal.call(
          doc,
          proposer,
          uintConfigs,
          addressConfigs,
          bytesConfigs,
          { from: accounts[i] },
        )));
      }
    });
    it('[valid call]: verify read functions', async function () {
      await contracts.daoSpecialStorage.addSpecialProposal(
        doc,
        proposer,
        uintConfigs,
        addressConfigs,
        bytesConfigs,
        { from: accounts[0] },
      );
      const readProposal = await contracts.daoSpecialStorage.readProposal.call(doc);
      assert.deepEqual(await contracts.daoSpecialStorage.readProposalProposer.call(doc), proposer);
      assert.deepEqual(readProposal[0], doc);
      assert.deepEqual(readProposal[1], proposer);
      assert.deepEqual(timeIsRecent(readProposal[2], getCurrentTimestamp(), 5), true);
      assert.deepEqual(readProposal[3], bN(0));
      // since the voting time has not been set yet
      assert.deepEqual(await contracts.daoSpecialStorage.readVotingTime.call(doc), bN(0));
    });
  });

  describe('commitVote', function () {
    before(async function () {
      votingObj = assignVotesAndCommits(addressOf);
    });
    it('[not called from CONTRACT_DAO_VOTING]: revert', async function () {
      for (const i of indexRange(1, 20)) {
        assert(await a.failure(contracts.daoSpecialStorage.commitVote.call(
          doc,
          votingObj.votingCommits[0][0],
          { from: accounts[i] },
        )));
      }
    });
    it('[valid call]: read commit vote', async function () {
      await contracts.daoSpecialStorage.commitVote(doc, votingObj.votingCommits[0][0], addressOf.dgdHolders[0]);
      await contracts.daoSpecialStorage.commitVote(doc, votingObj.votingCommits[0][1], addressOf.dgdHolders[1]);
      assert.deepEqual(await contracts.daoSpecialStorage.readCommitVote.call(doc, addressOf.dgdHolders[0]), votingObj.votingCommits[0][0]);
      assert.deepEqual(await contracts.daoSpecialStorage.readCommitVote.call(doc, addressOf.dgdHolders[1]), votingObj.votingCommits[0][1]);
      assert.deepEqual(await contracts.daoSpecialStorage.readCommitVote.call(doc, addressOf.dgdHolders[2]), EMPTY_BYTES);
    });
  });

  describe('revealVote', function () {
    it('[not called from CONTRACT_DAO_VOTING]: revert', async function () {
      for (const i of indexRange(1, 20)) {
        assert(await a.failure(contracts.daoSpecialStorage.revealVote.call(
          doc,
          addressOf.dgdHolders[0],
          true,
          bN(5),
          { from: accounts[i] },
        )));
      }
    });
    it('[valid call]: read vote', async function () {
      await contracts.daoSpecialStorage.revealVote(doc, addressOf.dgdHolders[0], false, bN(5));
      await contracts.daoSpecialStorage.revealVote(doc, addressOf.dgdHolders[1], true, bN(8));
      assert.deepEqual((await contracts.daoSpecialStorage.readVote.call(doc, addressOf.dgdHolders[0]))[1], bN(5));
      assert.deepEqual((await contracts.daoSpecialStorage.readVote.call(doc, addressOf.dgdHolders[1]))[1], bN(8));
      assert.deepEqual((await contracts.daoSpecialStorage.readVote.call(doc, addressOf.dgdHolders[2]))[1], bN(0));
      assert.deepEqual((await contracts.daoSpecialStorage.readVote.call(doc, addressOf.dgdHolders[0]))[0], false);
      assert.deepEqual((await contracts.daoSpecialStorage.readVote.call(doc, addressOf.dgdHolders[1]))[0], true);
      assert.deepEqual((await contracts.daoSpecialStorage.readVote.call(doc, addressOf.dgdHolders[2]))[0], false);
      const votingCount = await contracts.daoSpecialStorage.readVotingCount.call(doc, addressOf.allParticipants);
      assert.deepEqual(votingCount[0], bN(8));
      assert.deepEqual(votingCount[1], bN(5));
      assert.deepEqual(votingCount[2], bN(13));
    });
  });

  describe('setPass', function () {
    it('[not called from CONTRACT_DAO_VOTING_CLAIMS]: revert', async function () {
      for (const i of indexRange(1, 20)) {
        assert(await a.failure(contracts.daoSpecialStorage.setPass.call(
          doc,
          true,
          { from: accounts[i] },
        )));
      }
    });
    it('[valid call]: verify', async function () {
      assert.deepEqual(await contracts.daoSpecialStorage.readVotingResult.call(doc), false);
      await contracts.daoSpecialStorage.setPass(doc, true, { from: accounts[0] });
      assert.deepEqual(await contracts.daoSpecialStorage.readVotingResult.call(doc), true);
    });
  });

  describe('setVotingClaim', function () {
    it('[not called from CONTRACT_DAO_VOTING_CLAIMS]: revert', async function () {
      for (const i of indexRange(1, 20)) {
        assert(await a.failure(contracts.daoSpecialStorage.setVotingClaim.call(
          doc,
          true,
          { from: accounts[i] },
        )));
      }
    });
    it('[valid call]: verify', async function () {
      assert.deepEqual(await contracts.daoSpecialStorage.isClaimed.call(doc), false);
      await contracts.daoSpecialStorage.setVotingClaim(doc, true, { from: accounts[0] });
      assert.deepEqual(await contracts.daoSpecialStorage.isClaimed.call(doc), true);
    });
  });
});
