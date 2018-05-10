const a = require('awaiting');

const MockDGD = artifacts.require('./MockDGD.sol');
const MockBadge = artifacts.require('./MockBadge.sol');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  deployServices,
  deployInteractive,
} = require('../setup');

const {
  sampleBadgeWeights,
  sampleStakeWeights,
  configs,
  daoConstantsKeys,
  daoConstantsValues,
} = require('../daoHelpers');

const {
  randomBigNumber,
  getCurrentTimestamp,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoStakeLocking', function (accounts) {
  let libs;
  let resolver;
  let contracts;
  let addressOf;

  before(async function () {
    libs = await deployLibraries();
    resolver = await deployNewContractResolver();
    addressOf = await getAccountsAndAddressOf(accounts);
    contracts = {};
    await deployStorage(libs, contracts, resolver, addressOf);
    await deployServices(libs, contracts, resolver, addressOf);
    await deployInteractive(libs, contracts, resolver, addressOf);
    contracts.dgdToken = await MockDGD.at(process.env.DGD_ADDRESS);
    contracts.badgeToken = await MockBadge.at(process.env.DGD_BADGE_ADDRESS);
    if (process.env.FIRST_TEST) {
      await initialTransferTokens();
    }
    await resolver.register_contract('c:config:controller', addressOf.root);
  });

  const initialTransferTokens = async function () {
    await contracts.dgdToken.transfer(addressOf.dgdHolder1, sampleStakeWeights(bN).dgdHolder1);
    await contracts.dgdToken.transfer(addressOf.dgdHolder2, sampleStakeWeights(bN).dgdHolder2);
    await contracts.dgdToken.transfer(addressOf.dgdHolder3, sampleStakeWeights(bN).dgdHolder3);
    await contracts.dgdToken.transfer(addressOf.dgdHolder4, sampleStakeWeights(bN).dgdHolder4);
    await contracts.dgdToken.transfer(addressOf.dgdHolder5, sampleStakeWeights(bN).dgdHolder5);
    await contracts.dgdToken.transfer(addressOf.dgdHolder6, sampleStakeWeights(bN).dgdHolder6);
    await contracts.dgdToken.transfer(addressOf.badgeHolder1, sampleStakeWeights(bN).badgeHolder1);
    await contracts.dgdToken.transfer(addressOf.badgeHolder2, sampleStakeWeights(bN).badgeHolder2);
    await contracts.dgdToken.transfer(addressOf.badgeHolder3, sampleStakeWeights(bN).badgeHolder3);
    await contracts.dgdToken.transfer(addressOf.badgeHolder4, sampleStakeWeights(bN).badgeHolder4);

    await contracts.badgeToken.transfer(addressOf.badgeHolder1, sampleBadgeWeights(bN).badgeHolder1);
    await contracts.badgeToken.transfer(addressOf.badgeHolder2, sampleBadgeWeights(bN).badgeHolder2);
    await contracts.badgeToken.transfer(addressOf.badgeHolder3, sampleBadgeWeights(bN).badgeHolder3);
    await contracts.badgeToken.transfer(addressOf.badgeHolder4, sampleBadgeWeights(bN).badgeHolder4);

    assert.deepEqual(await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder3), sampleStakeWeights(bN).dgdHolder3);
    assert.deepEqual(await contracts.badgeToken.balanceOf.call(addressOf.badgeHolder2), sampleBadgeWeights(bN).badgeHolder2);
  };

  const setDummyConfig = async function () {
    // set locking phase to be 10 seconds
    // set quarter phase to be 20 seconds
    // for testing purpose
    await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION, bN(10));
    await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_QUARTER_DURATION, bN(20));
  };

  const setConfig = async function () {
    await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION,
                                                          daoConstantsValues(bN).CONFIG_LOCKING_PHASE_DURATION);
    await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_QUARTER_DURATION,
                                                          daoConstantsValues(bN).CONFIG_QUARTER_DURATION);
  };

  describe('lockDGD', function () {
    it('[amount = 0]: revert', async function () {
      assert(await a.failure(contracts.daoStakeLocking.lockDGD.call(
        bN(0),
        { from: addressOf.dgdHolder1 },
      )));
    });
    it('[sender has not approved DaoStakeLocking contract to transferFrom tokens]: transferFrom fails, revert', async function () {
      const balance = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder1);
      const amount = randomBigNumber(bN, balance);
      assert(await a.failure(contracts.daoStakeLocking.lockDGD.call(
        amount,
        { from: addressOf.dgdHolder1 },
      )));
    });
    it('[amount less than CONFIG_MINIMUM_LOCKED_DGD is locked]: locked success, but sender not yet a participant', async function () {
      const balance = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder1);
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, balance, { from: addressOf.dgdHolder1 });
      const amount = randomBigNumber(bN, configs(bN).CONFIG_MINIMUM_LOCKED_DGD);
      assert.deepEqual(await contracts.daoStakeLocking.lockDGD.call(
        amount,
        { from: addressOf.dgdHolder1 },
      ), true);
      await contracts.daoStakeLocking.lockDGD(amount, { from: addressOf.dgdHolder1 });
      const readRes = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolder1);
      assert.deepEqual(readRes[0], amount);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), amount);
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolder1), false);
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder1), balance.minus(amount));
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address), amount);
    });
    it('[amount equal to CONFIG_MINIMUM_LOCKED_DGD is locked]: locked success, sender is participant', async function () {
      const balance = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder2);
      const initialBalance = await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address);
      const initialTotalLocked = await contracts.daoStakeStorage.totalLockedDGDStake.call();
      const amount = configs(bN).CONFIG_MINIMUM_LOCKED_DGD;
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, amount, { from: addressOf.dgdHolder2 });
      assert.deepEqual(await contracts.daoStakeLocking.lockDGD.call(
        amount,
        { from: addressOf.dgdHolder2 },
      ), true);
      await contracts.daoStakeLocking.lockDGD(amount, { from: addressOf.dgdHolder2 });
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder2), balance.minus(amount));
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address), initialBalance.plus(amount));
      const readRes = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolder2);
      assert.deepEqual(readRes[0], amount);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), initialTotalLocked.plus(amount));
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolder2), true);
    });
  });

  describe('lockBadge', function () {
    before(async function () {
      await setDummyConfig();
    });
    const waitFor = async function (howManyBlocks) {
      const timeThen = getCurrentTimestamp();
      const blockNumberThen = web3.eth.blockNumber;
      async function wait() {
        await web3.eth.sendTransaction({ from: accounts[0], to: accounts[19], value: web3.toWei(0.0001, 'ether') });
        if (web3.eth.blockNumber > blockNumberThen + howManyBlocks) return;
        await wait();
      }
      console.log('       waiting for next phase...');
      await wait();
      return timeThen;
    };
    it('[locking phase, amount = 0]: revert', async function () {
      assert(await a.failure(contracts.daoStakeLocking.lockBadge.call(
        bN(0),
        { from: addressOf.badgeHolder3 },
      )));
    });
    it('[locking phase, not approved transfer, amount > 0]: revert', async function () {
      assert(await a.failure(contracts.daoStakeLocking.lockBadge.call(
        bN(1),
        { from: addressOf.badgeHolder3 },
      )));
    });
    it('[locking phase, amount > 0]: add badge participant', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isBadgeParticipant.call(addressOf.badgeHolder1), false);
      const initialBalance = await contracts.badgeToken.balanceOf.call(addressOf.badgeHolder1);
      const initialContractBalance = await contracts.badgeToken.balanceOf.call(contracts.daoStakeLocking.address);
      const initialLockedBadges = await contracts.daoStakeStorage.readUserLockedBadge.call(addressOf.badgeHolder1);
      const initialTotalLockedBadges = await contracts.daoStakeStorage.totalLockedBadges.call();
      assert.isAtLeast(initialBalance.toNumber(), 1);
      const amount = bN(1);
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, amount, { from: addressOf.badgeHolder1 });

      assert.deepEqual(await contracts.daoStakeLocking.lockBadge.call(
        amount,
        { from: addressOf.badgeHolder1 },
      ), true);
      await contracts.daoStakeLocking.lockBadge(amount, { from: addressOf.badgeHolder1 });
      assert.deepEqual(await contracts.daoStakeStorage.readUserLockedBadge.call(addressOf.badgeHolder1), initialLockedBadges.plus(amount));
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedBadges.call(), initialTotalLockedBadges.plus(amount));
      assert.deepEqual(await contracts.badgeToken.balanceOf.call(addressOf.badgeHolder1), initialBalance.minus(amount));
      assert.deepEqual(await contracts.badgeToken.balanceOf.call(contracts.daoStakeLocking.address), initialContractBalance.plus(amount));
      assert.deepEqual(await contracts.daoStakeStorage.isBadgeParticipant.call(addressOf.badgeHolder1), true);
    });
    it('[after locking phase has ended, valid amount]: revert', async function () {
      // spend more than 10 seconds and less than 20 secs (locking_time/quarter_time as set in dummyConfig)
      const timeThen = await waitFor(60);
      assert.isAtLeast(getCurrentTimestamp() - timeThen, 10);
      assert.isBelow(getCurrentTimestamp() - timeThen, 20);

      // continue
      assert.isAtLeast((await contracts.badgeToken.balanceOf.call(addressOf.badgeHolder2)).toNumber(), 1);
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(1), { from: addressOf.badgeHolder2 });

      assert(await a.failure(contracts.daoStakeLocking.lockBadge.call(
        bN(1),
        { from: addressOf.badgeHolder2 },
      )));
    });
    after(async function () {
      await setConfig();
    });
  });

  describe('withdrawDGD', function () {
    before(async function () {
      await setDummyConfig();
    });
    const waitFor = async function (howManyBlocks) {
      const timeThen = getCurrentTimestamp();
      const blockNumberThen = web3.eth.blockNumber;
      async function wait() {
        await web3.eth.sendTransaction({ from: accounts[0], to: accounts[19], value: web3.toWei(0.0001, 'ether') });
        if (web3.eth.blockNumber > blockNumberThen + howManyBlocks) return;
        await wait();
      }
      console.log('       waiting for next phase...');
      await wait();
      return timeThen;
    };
    it('[withdraw more than locked amount]: revert', async function () {
      // dgdHolder2 is the user in context
      const lockedAmount = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolder2);
      await waitFor(50);
      assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      const withdrawAmount = lockedAmount[0].plus(bN(1));
      assert(await a.failure(contracts.daoStakeLocking.withdrawDGD.call(
        withdrawAmount,
        { from: addressOf.dgdHolder2 },
      )));
    });
    it('[withdraw less than locked amount, still locked enough to be participant]: success, verify read functions', async function () {
      const lockedAmount = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolder2);
      // make sure its locking phase and dgdHolder2 is a participant already
      assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolder2), true);
      // if this amount is withdrawn, there will still be enough for dgdHolder2 to be participant
      const withdrawAmount = lockedAmount[0].minus(configs(bN).CONFIG_MINIMUM_LOCKED_DGD);

      // initial info
      const balanceBefore = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder2);
      const contractBalanceBefore = await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address);
      const totalLockedDGDBefore = await contracts.daoStakeStorage.totalLockedDGDStake.call();

      assert.deepEqual(await contracts.daoStakeLocking.withdrawDGD.call(withdrawAmount, { from: addressOf.dgdHolder2 }), true);
      await contracts.daoStakeLocking.withdrawDGD(withdrawAmount, { from: addressOf.dgdHolder2 });

      // verify that dgdHolder2 is still a participant
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolder2), true);
      // note the DGD balances
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address), contractBalanceBefore.minus(withdrawAmount));
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder2), balanceBefore.plus(withdrawAmount));
      const readStake = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolder2);
      assert.deepEqual(readStake[0], lockedAmount[0].minus(withdrawAmount));
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), totalLockedDGDBefore.minus(withdrawAmount));
    });
    it('[withdraw less than locked amount, now should no more be a participant]: success, verify read functions', async function () {
      const lockedAmount = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolder2);
      // make sure its locking phase and dgdHolder2 is a participant already
      assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolder2), true);
      // if this amount is withdrawn, there will still be enough for dgdHolder2 to be participant
      const withdrawAmount = randomBigNumber(bN, configs(bN).CONFIG_MINIMUM_LOCKED_DGD);

      // initial info
      const balanceBefore = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder2);
      const contractBalanceBefore = await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address);
      const totalLockedDGDBefore = await contracts.daoStakeStorage.totalLockedDGDStake.call();

      assert.deepEqual(await contracts.daoStakeLocking.withdrawDGD.call(withdrawAmount, { from: addressOf.dgdHolder2 }), true);
      await contracts.daoStakeLocking.withdrawDGD(withdrawAmount, { from: addressOf.dgdHolder2 });

      // verify that dgdHolder2 is still a participant
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolder2), false);
      // note the DGD balances
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address), contractBalanceBefore.minus(withdrawAmount));
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder2), balanceBefore.plus(withdrawAmount));
      const readStake = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolder2);
      assert.deepEqual(readStake[0], lockedAmount[0].minus(withdrawAmount));
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), totalLockedDGDBefore.minus(withdrawAmount));
    });
    it('[withdraw during the main phase]: revert', async function () {
      await waitFor(50);
      assert.deepEqual(await contracts.daoStakeLocking.isMainPhase.call(), true);
      const lockedAmount = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolder1);
      const withdrawAmount = randomBigNumber(bN, lockedAmount[0]);
      assert(await a.failure(contracts.daoStakeLocking.withdrawDGD.call(
        withdrawAmount,
        { from: addressOf.dgdHolder1 },
      )));
    });
    after(async function () {
      await setConfig();
    });
  });

  describe('withdrawBadge', function () {
    before(async function () {
      await setDummyConfig();
    });
    it('[withdraw more than locked amount]: revert', async function () {

    });
    it('[withdraw less than locked amount, still badge participant]: success, verify read functions', async function () {

    });
    it('[withdraw all badges, now should no more be a badge participant]: success, verify read functions', async function () {

    });
    it('[withdraw during the main phase]: revert', async function () {

    });
    after(async function () {
      await setConfig();
    });
  });
});
