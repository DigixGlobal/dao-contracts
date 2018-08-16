const a = require('awaiting');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  registerInteractive,
} = require('../setup');

const {
  randomBytes32s,
  randomAddresses,
  randomBigNumbers,
} = require('@digix/helpers/lib/helpers');

const {
  EMPTY_ADDRESS,
} = require('../daoHelpers');

const bN = web3.toBigNumber;

contract('IntermediateResultsStorage', function (accounts) {
  let libs;
  let addressOf;
  let contracts;
  const key = randomBytes32s(2);
  const countedUntil = randomAddresses(2);
  const forCount = randomBigNumbers(bN, 2);
  const againstCount = randomBigNumbers(bN, 2);
  const quorum = randomBigNumbers(bN, 2);
  const sum = randomBigNumbers(bN, 2);

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
    it('[verify key]', async function () {
      assert.deepEqual(await contracts.resolver.get_contract.call('storage:intermediate:results'), contracts.intermediateResultsStorage.address);
    });
  });

  describe('setIntermediateResults', function () {
    it('[not called by CONTRACT_DAO_REWARDS_MANAGER, CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_SPECIAL_VOTING_CLAIMS]: revert', async function () {
      assert(await a.failure(contracts.intermediateResultsStorage.setIntermediateResults.call(
        key[0],
        countedUntil[0],
        forCount[0],
        againstCount[0],
        quorum[0],
        sum[0],
        { from: accounts[2] },
      )));
    });
    it('[valid call]: read getIntermediateResults', async function () {
      await contracts.intermediateResultsStorage.setIntermediateResults(
        key[0],
        countedUntil[0],
        forCount[0],
        againstCount[0],
        quorum[0],
        sum[0],
      );
      const getResult = await contracts.intermediateResultsStorage.getIntermediateResults.call(key[0]);
      assert.deepEqual(getResult[0], countedUntil[0]);
      assert.deepEqual(getResult[1], forCount[0]);
      assert.deepEqual(getResult[2], againstCount[0]);
      assert.deepEqual(getResult[3], quorum[0]);
      assert.deepEqual(getResult[4], sum[0]);

      await contracts.intermediateResultsStorage.setIntermediateResults(
        key[1],
        countedUntil[1],
        forCount[1],
        againstCount[1],
        quorum[1],
        sum[1],
      );
      const getResult1 = await contracts.intermediateResultsStorage.getIntermediateResults.call(key[1]);
      assert.deepEqual(getResult1[0], countedUntil[1]);
      assert.deepEqual(getResult1[1], forCount[1]);
      assert.deepEqual(getResult1[2], againstCount[1]);
      assert.deepEqual(getResult1[3], quorum[1]);
      assert.deepEqual(getResult1[4], sum[1]);
    });
  });

  describe('resetIntermediateResults', function () {
    it('[not called by CONTRACT_DAO_REWARDS_MANAGER, CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_SPECIAL_VOTING_CLAIMS]: revert', async function () {
      assert(await a.failure(contracts.intermediateResultsStorage.resetIntermediateResults.call(
        key[0],
        { from: accounts[2] },
      )));
    });
    it('[valid call]: reset results', async function () {
      await contracts.intermediateResultsStorage.resetIntermediateResults(key[0]);
      const getResult = await contracts.intermediateResultsStorage.getIntermediateResults.call(key[0]);
      assert.deepEqual(getResult[0], EMPTY_ADDRESS);

      await contracts.intermediateResultsStorage.resetIntermediateResults(key[1]);
      const getResult1 = await contracts.intermediateResultsStorage.getIntermediateResults.call(key[1]);
      assert.deepEqual(getResult1[0], EMPTY_ADDRESS);
    });
  });
});
