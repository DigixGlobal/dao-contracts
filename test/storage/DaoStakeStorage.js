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

  describe('Initialization', function () {
    it('[contract key]', async function () {
      assert.deepEqual(await resolver.get_contract.call('s:stake'), contracts.daoStakeStorage.address);
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
        addressOf.badgeHolder1,
        lockedBadge,
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      await contracts.daoStakeStorage.updateUserBadgeStake(addressOf.badgeHolder1, lockedBadge);
      assert.deepEqual(await contracts.daoStakeStorage.readUserLockedBadge.call(addressOf.badgeHolder1), lockedBadge);
    });
  });

  describe('addParticipant', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.addParticipant.call(
        addressOf.dgdHolder1,
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolder1), false);
      assert.deepEqual(await contracts.daoStakeStorage.addParticipant.call(addressOf.dgdHolder1), true);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolder1);
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolder1), true);
    });
  });

  describe('removeParticipant', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.removeParticipant.call(
        addressOf.dgdHolder1,
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.removeParticipant.call(addressOf.dgdHolder1), true);
      await contracts.daoStakeStorage.removeParticipant(addressOf.dgdHolder1);
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolder1), false);
    });
  });

  describe('addBadgeParticipant', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.addBadgeParticipant.call(
        addressOf.badgeHolder1,
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isBadgeParticipant.call(addressOf.badgeHolder1), false);
      assert.deepEqual(await contracts.daoStakeStorage.addBadgeParticipant.call(addressOf.badgeHolder1), true);
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolder1);
      assert.deepEqual(await contracts.daoStakeStorage.isBadgeParticipant.call(addressOf.badgeHolder1), true);
    });
  });

  describe('removeBadgeParticipant', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {
      assert(await a.failure(contracts.daoStakeStorage.removeBadgeParticipant.call(
        addressOf.badgeHolder1,
        { from: accounts[2] },
      )));
    });
    it('[valid call]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.removeBadgeParticipant.call(addressOf.badgeHolder1), true);
      await contracts.daoStakeStorage.removeBadgeParticipant(addressOf.badgeHolder1);
      assert.deepEqual(await contracts.daoStakeStorage.isBadgeParticipant.call(addressOf.badgeHolder1), false);
    });
  });

  describe('Read Functions', function () {
    before(async function () {
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolder2);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolder3);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolder4);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolder5);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolder6);
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolder2);
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolder3);
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolder4);
    });
    it('[readFirstBadgeParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readFirstBadgeParticipant.call(), addressOf.badgeHolder2);
      await contracts.daoStakeStorage.removeBadgeParticipant(addressOf.badgeHolder2);
      assert.deepEqual(await contracts.daoStakeStorage.readFirstBadgeParticipant.call(), addressOf.badgeHolder3);
    });
    it('[readLastBadgeParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readLastBadgeParticipant.call(), addressOf.badgeHolder4);
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolder2);
      assert.deepEqual(await contracts.daoStakeStorage.readLastBadgeParticipant.call(), addressOf.badgeHolder2);
    });
    it('[readNextBadgeParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readNextBadgeParticipant.call(addressOf.badgeHolder3), addressOf.badgeHolder4);
      assert.deepEqual(await contracts.daoStakeStorage.readNextBadgeParticipant.call(addressOf.badgeHolder4), addressOf.badgeHolder2);
      assert.deepEqual(await contracts.daoStakeStorage.readNextBadgeParticipant.call(addressOf.badgeHolder2), EMPTY_ADDRESS);
      await contracts.daoStakeStorage.removeBadgeParticipant(addressOf.badgeHolder4);
      assert.deepEqual(await contracts.daoStakeStorage.readNextBadgeParticipant.call(addressOf.badgeHolder3), addressOf.badgeHolder2);
    });
    it('[readPreviousBadgeParticipant]', async function () {
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolder4);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousBadgeParticipant.call(addressOf.badgeHolder3), EMPTY_ADDRESS);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousBadgeParticipant.call(addressOf.badgeHolder2), addressOf.badgeHolder3);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousBadgeParticipant.call(addressOf.badgeHolder4), addressOf.badgeHolder2);
      await contracts.daoStakeStorage.removeBadgeParticipant(addressOf.badgeHolder2);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousBadgeParticipant.call(addressOf.badgeHolder4), addressOf.badgeHolder3);
    });
    it('[readTotalBadgeParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readTotalBadgeParticipant.call(), bN(2));
      await contracts.daoStakeStorage.addBadgeParticipant(addressOf.badgeHolder1);
      assert.deepEqual(await contracts.daoStakeStorage.readTotalBadgeParticipant.call(), bN(3));
      await contracts.daoStakeStorage.removeBadgeParticipant(addressOf.badgeHolder4);
      await contracts.daoStakeStorage.removeBadgeParticipant(addressOf.badgeHolder3);
      assert.deepEqual(await contracts.daoStakeStorage.readTotalBadgeParticipant.call(), bN(1));
    });
    it('[readFirstParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readFirstParticipant.call(), addressOf.dgdHolder2);
      await contracts.daoStakeStorage.removeParticipant(addressOf.dgdHolder2);
      assert.deepEqual(await contracts.daoStakeStorage.readFirstParticipant.call(), addressOf.dgdHolder3);
    });
    it('[readLastParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readLastParticipant.call(), addressOf.dgdHolder6);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolder2);
      assert.deepEqual(await contracts.daoStakeStorage.readLastParticipant.call(), addressOf.dgdHolder2);
    });
    it('[readNextParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolder3), addressOf.dgdHolder4);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolder4), addressOf.dgdHolder5);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolder5), addressOf.dgdHolder6);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolder6), addressOf.dgdHolder2);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolder2), EMPTY_ADDRESS);
      await contracts.daoStakeStorage.removeParticipant(addressOf.dgdHolder5);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolder4), addressOf.dgdHolder6);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolder5);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolder2), addressOf.dgdHolder5);
      assert.deepEqual(await contracts.daoStakeStorage.readNextParticipant.call(addressOf.dgdHolder5), EMPTY_ADDRESS);
    });
    it('[readPreviousParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolder5), addressOf.dgdHolder2);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolder2), addressOf.dgdHolder6);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolder6), addressOf.dgdHolder4);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolder4), addressOf.dgdHolder3);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolder3), EMPTY_ADDRESS);
      await contracts.daoStakeStorage.removeParticipant(addressOf.dgdHolder4);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolder6), addressOf.dgdHolder3);
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolder4);
      assert.deepEqual(await contracts.daoStakeStorage.readPreviousParticipant.call(addressOf.dgdHolder4), addressOf.dgdHolder5);
    });
    it('[readTotalParticipant]', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.readTotalParticipant.call(), bN(5));
      await contracts.daoStakeStorage.removeParticipant(addressOf.dgdHolder5);
      await contracts.daoStakeStorage.removeParticipant(addressOf.dgdHolder2);
      assert.deepEqual(await contracts.daoStakeStorage.readTotalParticipant.call(), bN(3));
      await contracts.daoStakeStorage.addParticipant(addressOf.dgdHolder2);
      assert.deepEqual(await contracts.daoStakeStorage.readTotalParticipant.call(), bN(4));
    });
  });
});
