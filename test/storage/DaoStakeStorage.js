const a = require('awaiting');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  registerInteractive,
} = require('../setup');

const {
  EMPTY_ADDRESS,
} = require('../daoHelpers');

const {
  randomAddress,
  randomBigNumber,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoStakeStorage', function (accounts) {
  let libs;
  let addressOf;
  let contracts;

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
      assert.deepEqual(await contracts.resolver.get_contract.call('storage:dao:stake'), contracts.daoStakeStorage.address);
    });
  });

  describe('updateTotalLockedDGDStake', function () {
    const totalLockedDGD = randomBigNumber(bN);
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.updateTotalLockedDGDStake.call(
        totalLockedDGD,
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      await contracts.daoStakeStorage.updateTotalLockedDGDStake(totalLockedDGD);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), totalLockedDGD);
      const newTotalLockedDGD = randomBigNumber(bN);
      await contracts.daoStakeStorage.updateTotalLockedDGDStake(newTotalLockedDGD);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), newTotalLockedDGD);
    });
  });

  describe('updateUserDGDStake', function () {
    const randomUser = randomAddress();
    const actualLockedDGD = randomBigNumber(bN);
    const lockedDGDStake = randomBigNumber(bN);
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.updateUserDGDStake.call(
        randomUser,
        actualLockedDGD,
        lockedDGDStake,
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      await contracts.daoStakeStorage.updateUserDGDStake(randomUser, actualLockedDGD, lockedDGDStake);
      const readRes = await contracts.daoStakeStorage.readUserDGDStake.call(randomUser);
      assert.deepEqual(readRes[0], actualLockedDGD);
      assert.deepEqual(readRes[1], lockedDGDStake);
    });
  });

  describe('addToParticipantList', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.addToParticipantList.call(
        addressOf.dgdHolders[0],
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.dgdHolders[0]), false);
      assert.deepEqual(await contracts.daoStakeStorage.addToParticipantList.call(addressOf.dgdHolders[0]), true);
      await contracts.daoStakeStorage.addToParticipantList(addressOf.dgdHolders[0]);
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.dgdHolders[0]), true);
    });
  });

  describe('removeFromParticipantList', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.removeFromParticipantList.call(
        addressOf.dgdHolders[0],
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.removeFromParticipantList.call(addressOf.dgdHolders[0]), true);
      await contracts.daoStakeStorage.removeFromParticipantList(addressOf.dgdHolders[0]);
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.dgdHolders[0]), false);
    });
  });

  describe('Read Functions', function () {
    before(async function () {
      await contracts.daoStakeStorage.addToParticipantList(addressOf.dgdHolders[1]);
      await contracts.daoStakeStorage.addToParticipantList(addressOf.dgdHolders[2]);
      await contracts.daoStakeStorage.addToParticipantList(addressOf.dgdHolders[3]);
      await contracts.daoStakeStorage.addToParticipantList(addressOf.dgdHolders[4]);
      await contracts.daoStakeStorage.addToParticipantList(addressOf.dgdHolders[5]);
    });
    it('[readFirstParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readFirstParticipant.call(), addressOf.dgdHolders[1]);
      await contracts.daoStakeStorage.removeFromParticipantList(addressOf.dgdHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readFirstParticipant.call(), addressOf.dgdHolders[2]);
    });
    it('[readLastParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readLastParticipant.call(), addressOf.dgdHolders[5]);
      await contracts.daoStakeStorage.addToParticipantList(addressOf.dgdHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readLastParticipant.call(), addressOf.dgdHolders[1]);
    });
    it('[readNextParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[2]), addressOf.dgdHolders[3]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[3]), addressOf.dgdHolders[4]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[4]), addressOf.dgdHolders[5]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[5]), addressOf.dgdHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[1]), EMPTY_ADDRESS);
      await contracts.daoStakeStorage.removeFromParticipantList(addressOf.dgdHolders[4]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[3]), addressOf.dgdHolders[5]);
      await contracts.daoStakeStorage.addToParticipantList(addressOf.dgdHolders[4]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[1]), addressOf.dgdHolders[4]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[4]), EMPTY_ADDRESS);
    });
    it('[readPreviousParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[4]), addressOf.dgdHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[1]), addressOf.dgdHolders[5]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[5]), addressOf.dgdHolders[3]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[3]), addressOf.dgdHolders[2]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[2]), EMPTY_ADDRESS);
      await contracts.daoStakeStorage.removeFromParticipantList(addressOf.dgdHolders[3]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[5]), addressOf.dgdHolders[2]);
      await contracts.daoStakeStorage.addToParticipantList(addressOf.dgdHolders[3]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[3]), addressOf.dgdHolders[4]);
    });
    it('[readTotalParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readTotalParticipant.call(), bN(5));
      await contracts.daoStakeStorage.removeFromParticipantList(addressOf.dgdHolders[4]);
      await contracts.daoStakeStorage.removeFromParticipantList(addressOf.dgdHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readTotalParticipant.call(), bN(3));
      await contracts.daoStakeStorage.addToParticipantList(addressOf.dgdHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readTotalParticipant.call(), bN(4));
    });
  });
});
