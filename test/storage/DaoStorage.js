const DaoStorage = artifacts.require('DaoStorage.sol');

const {
  randomBytes32,
  randomAddress,
  zeroAddress,
  timeIsRecent,
} = require('@digix/helpers/lib/helpers');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  registerInteractive,
} = require('../setup');

const {
  proposalStates,
} = require('../daoHelpers');

const bN = web3.toBigNumber;

const callingKeys = [
  'c:dao',
];

contract('DaoStorage', function (accounts) {
  let libs;
  let resolver;
  let addressOf;
  let contracts;

  before(async function () {
    libs = await deployLibraries();
    resolver = await deployNewContractResolver();
    addressOf = await getAccountsAndAddressOf(accounts);
    contracts = {};
    await deployStorage(libs, contracts, resolver, addressOf);
    await registerInteractive(resolver, addressOf);
  });

  describe('addProposal', function () {
    it('[new proposal]: verify read functions', async function () {
      const doc = randomBytes32();
      const proposer = randomAddress();
      const durations = [bN(35), bN(45), bN(55)];
      const fundings = [bN(100), bN(200), bN(50)];
      assert.deepEqual(await contracts.daoStorage.addProposal.call(
        doc,
        proposer,
        durations,
        fundings,
      ), true);
      await contracts.daoStorage.addProposal(doc, proposer, durations, fundings);
      const readProposalRes = await contracts.daoStorage.readProposal.call(doc);
      assert.deepEqual(readProposalRes[0], doc);
      assert.deepEqual(readProposalRes[1], proposer);
      assert.deepEqual(readProposalRes[2], zeroAddress);
      assert.deepEqual(readProposalRes[3], proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL);
      assert.deepEqual(timeIsRecent(readProposalRes[4], 1000), true);
      assert.deepEqual(readProposalRes[5], bN(1));
      assert.deepEqual(readProposalRes[6], doc);
    });
  });

  describe('editProposal', function () {

  });

  describe('updateProposalEndorse', function () {

  });
});
