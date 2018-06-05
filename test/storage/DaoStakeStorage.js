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
    libs = await deployLibraries();
    contracts = {};
    await deployNewContractResolver(contracts);
    addressOf = await getAccountsAndAddressOf(accounts);
    await deployStorage(libs, contracts, contracts.resolver, addressOf);
    await registerInteractive(contracts.resolver, addressOf);
  });

  describe('Initialization', function () {
    it('[contract key]', async function () {
      assert.deepEqual(await contracts.resolver.get_contract.call('s:stake'), contracts.daoStakeStorage.address);
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

  describe('updateTotalLockedBadges', function () {
    const totalLockedBadges = randomBigNumber(bN);
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.updateTotalLockedBadges.call(
        totalLockedBadges,
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      await contracts.daoStakeStorage.updateTotalLockedBadges(totalLockedBadges);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedBadges.call(), totalLockedBadges);
      const newTotalLockedBadges = randomBigNumber(bN);
      await contracts.daoStakeStorage.updateTotalLockedBadges(newTotalLockedBadges);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedBadges.call(), newTotalLockedBadges);
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

  describe('updateUserBadgeStake', function () {
    const lockedBadge = randomBigNumber(bN);
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.updateUserBadgeStake.call(
        addressOf.badgeHolders[0],
        lockedBadge,
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      await contracts.daoStakeStorage.updateUserBadgeStake(addressOf.badgeHolders[0], lockedBadge);
      assert.deepEqual(await contracts.daoStakeStorage.readUserLockedBadge.call(addressOf.badgeHolders[0]), lockedBadge);
    });
  });

  describe('addParticipant', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.addParticipant.call(
        addressOf.dgdHolders[0],
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolders[0]), false);
      assert.deepEqual(await contracts.daoStakeStorage.addParticipant.call(addressOf.dgdHolders[0]), true);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolders[0]);
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolders[0]), true);
    });
  });

  describe('removeParticipant', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.removeParticipant.call(
        addressOf.dgdHolders[0],
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.removeParticipant.call(addressOf.dgdHolders[0]), true);
      await contracts.daoStakeStorage.removeParticipant(addressOf.dgdHolders[0]);
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolders[0]), false);
    });
  });

  describe('addBadgeParticipant', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.addBadgeParticipant.call(
        addressOf.badgeHolders[0],
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isBadgeParticipant.call(addressOf.badgeHolders[0]), false);
      assert.deepEqual(await contracts.daoStakeStorage.addBadgeParticipant.call(addressOf.badgeHolders[0]), true);
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolders[0]);
      assert.deepEqual(await contracts.daoStakeStorage.isBadgeParticipant.call(addressOf.badgeHolders[0]), true);
    });
  });

  describe('removeBadgeParticipant', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.removeBadgeParticipant.call(
        addressOf.badgeHolders[0],
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.removeBadgeParticipant.call(addressOf.badgeHolders[0]), true);
      await contracts.daoStakeStorage.removeBadgeParticipant(addressOf.badgeHolders[0]);
      assert.deepEqual(await contracts.daoStakeStorage.isBadgeParticipant.call(addressOf.badgeHolders[0]), false);
    });
  });

  describe('Read Functions', function () {
    before(async function () {
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolders[1]);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolders[2]);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolders[3]);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolders[4]);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolders[5]);
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolders[1]);
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolders[2]);
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolders[3]);
    });
    it('[readFirstBadgeParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readFirstBadgeParticipant.call(), addressOf.badgeHolders[1]);
      await contracts.daoStakeStorage.removeBadgeParticipant(addressOf.badgeHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readFirstBadgeParticipant.call(), addressOf.badgeHolders[2]);
    });
    it('[readLastBadgeParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readLastBadgeParticipant.call(), addressOf.badgeHolders[3]);
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readLastBadgeParticipant.call(), addressOf.badgeHolders[1]);
    });
    it('[readNextBadgeParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readNextBadgeParticipant.call(addressOf.badgeHolders[2]), addressOf.badgeHolders[3]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextBadgeParticipant.call(addressOf.badgeHolders[3]), addressOf.badgeHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextBadgeParticipant.call(addressOf.badgeHolders[1]), EMPTY_ADDRESS);
      await contracts.daoStakeStorage.removeBadgeParticipant(addressOf.badgeHolders[3]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextBadgeParticipant.call(addressOf.badgeHolders[2]), addressOf.badgeHolders[1]);
    });
    it('[readPreviousBadgeParticipant]', async function () {
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolders[3]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousBadgeParticipant.call(addressOf.badgeHolders[2]), EMPTY_ADDRESS);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousBadgeParticipant.call(addressOf.badgeHolders[1]), addressOf.badgeHolders[2]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousBadgeParticipant.call(addressOf.badgeHolders[3]), addressOf.badgeHolders[1]);
      await contracts.daoStakeStorage.removeBadgeParticipant(addressOf.badgeHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousBadgeParticipant.call(addressOf.badgeHolders[3]), addressOf.badgeHolders[2]);
    });
    it('[readTotalBadgeParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readTotalBadgeParticipant.call(), bN(2));
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolders[0]);
      assert.deepEqual(await contracts.daoStakeStorage.readTotalBadgeParticipant.call(), bN(3));
      await contracts.daoStakeStorage.removeBadgeParticipant(addressOf.badgeHolders[3]);
      await contracts.daoStakeStorage.removeBadgeParticipant(addressOf.badgeHolders[2]);
      assert.deepEqual(await contracts.daoStakeStorage.readTotalBadgeParticipant.call(), bN(1));
    });
    it('[readFirstParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readFirstParticipant.call(), addressOf.dgdHolders[1]);
      await contracts.daoStakeStorage.removeParticipant(addressOf.dgdHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readFirstParticipant.call(), addressOf.dgdHolders[2]);
    });
    it('[readLastParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readLastParticipant.call(), addressOf.dgdHolders[5]);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readLastParticipant.call(), addressOf.dgdHolders[1]);
    });
    it('[readNextParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[2]), addressOf.dgdHolders[3]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[3]), addressOf.dgdHolders[4]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[4]), addressOf.dgdHolders[5]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[5]), addressOf.dgdHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[1]), EMPTY_ADDRESS);
      await contracts.daoStakeStorage.removeParticipant(addressOf.dgdHolders[4]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[3]), addressOf.dgdHolders[5]);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolders[4]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[1]), addressOf.dgdHolders[4]);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolders[4]), EMPTY_ADDRESS);
    });
    it('[readPreviousParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[4]), addressOf.dgdHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[1]), addressOf.dgdHolders[5]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[5]), addressOf.dgdHolders[3]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[3]), addressOf.dgdHolders[2]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[2]), EMPTY_ADDRESS);
      await contracts.daoStakeStorage.removeParticipant(addressOf.dgdHolders[3]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[5]), addressOf.dgdHolders[2]);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolders[3]);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolders[3]), addressOf.dgdHolders[4]);
    });
    it('[readTotalParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readTotalParticipant.call(), bN(5));
      await contracts.daoStakeStorage.removeParticipant(addressOf.dgdHolders[4]);
      await contracts.daoStakeStorage.removeParticipant(addressOf.dgdHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readTotalParticipant.call(), bN(3));
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolders[1]);
      assert.deepEqual(await contracts.daoStakeStorage.readTotalParticipant.call(), bN(4));
    });
  });
});
