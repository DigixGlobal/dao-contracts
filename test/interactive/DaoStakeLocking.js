const a = require('awaiting');

const MockDGD = artifacts.require('./MockDGD.sol');
const MockBadge = artifacts.require('./MockBadge.sol');
const MockDgxDemurrageReporter = artifacts.require('./MockDgxDemurrageReporter.sol');
const MockDgx = artifacts.require('./MockDgx.sol');
const MockDgxStorage = artifacts.require('./MockDgxStorage.sol');

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
  phases,
  getPhase,
  getTimeToNextPhase,
} = require('../daoHelpers');

const {
  randomBigNumber,
  getCurrentTimestamp,
  timeIsRecent,
  indexRange,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoStakeLocking', function (accounts) {
  let libs;
  let contracts;
  let addressOf;

  before(async function () {
    libs = await deployLibraries();
    contracts = {};
    await deployNewContractResolver(contracts);
    addressOf = await getAccountsAndAddressOf(accounts);
    contracts.dgdToken = await MockDGD.new();
    contracts.badgeToken = await MockBadge.new();
    contracts.dgxStorage = await MockDgxStorage.new();
    contracts.dgxToken = await MockDgx.new(contracts.dgxStorage.address, addressOf.feesadmin);
    await contracts.dgxStorage.setInteractive(contracts.dgxToken.address);
    contracts.dgxDemurrageReporter = await MockDgxDemurrageReporter.new(contracts.dgxToken.address);
    await deployStorage(libs, contracts, contracts.resolver);
    await deployServices(libs, contracts, contracts.resolver);
    await deployInteractive(libs, contracts, contracts.resolver);
    await contracts.daoIdentity.addGroupUser(bN(2), addressOf.founderBadgeHolder, '');
    await contracts.dao.setStartOfFirstQuarter(getCurrentTimestamp(), { from: addressOf.founderBadgeHolder });
    await initialTransferTokens();

    assert.deepEqual(timeIsRecent(await contracts.daoStorage.startOfFirstQuarter.call()), true);
    await setDummyConfig();
  });

  const initialTransferTokens = async function () {
    await a.map(indexRange(0, 10), 20, async (index) => {
      await contracts.dgdToken.transfer(addressOf.allParticipants[index], sampleStakeWeights(bN)[index]);
    });
    await a.map(indexRange(0, 4), 20, async (index) => {
      await contracts.badgeToken.transfer(addressOf.badgeHolders[index], sampleBadgeWeights(bN)[index]);
    });
  };

  const setDummyConfig = async function () {
    // set locking phase to be 10 seconds
    // set quarter phase to be 20 seconds
    // for testing purpose
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION, bN(10));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_QUARTER_DURATION, bN(20));
  };

  const waitFor = async function (timeToWait) {
    const timeThen = getCurrentTimestamp();
    async function wait() {
      await web3.eth.sendTransaction({ from: accounts[0], to: accounts[19], value: web3.toWei(0.0001, 'ether') });
      if ((getCurrentTimestamp() - timeThen) > timeToWait) return;
      await wait();
    }
    await wait();
  };

  /**
   * Wait for time to pass, end in the phaseToEndIn phase
   * @param phaseToEndIn : The phase in which to land (phases.LOCKING_PHASE or phases.MAIN_PHASE)
   */
  const phaseCorrection = async function (phaseToEndIn) {
    const startOfDao = await contracts.daoStorage.startOfFirstQuarter.call();
    const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
    const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
    const currentPhase = getPhase(
      getCurrentTimestamp(),
      startOfDao.toNumber(),
      lockingPhaseDuration.toNumber(),
      quarterDuration.toNumber(),
    );
    if (currentPhase !== phaseToEndIn) {
      const timeToNextPhase = getTimeToNextPhase(getCurrentTimestamp(), startOfDao.toNumber(), lockingPhaseDuration.toNumber(), quarterDuration.toNumber());
      console.log('       waiting for next phase...');
      await waitFor(timeToNextPhase);
    }
  };

  describe('lockDGD | confirmContinuedParticipation', function () {
    before(async function () {
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 18)), { from: addressOf.badgeHolders[1] });
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 18)), { from: addressOf.badgeHolders[2] });
    });
    it('[amount = 0]: revert', async function () {
      assert(await a.failure(contracts.daoStakeLocking.lockDGD.call(
        bN(0),
        { from: addressOf.dgdHolders[0] },
      )));
    });
    it('[sender has not approved DaoStakeLocking contract to transferFrom tokens]: transferFrom fails, revert', async function () {
      const balance = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[0]);
      const amount = randomBigNumber(bN, balance);
      assert(await a.failure(contracts.daoStakeLocking.lockDGD.call(
        amount,
        { from: addressOf.dgdHolders[0] },
      )));
    });
    it('[amount less than CONFIG_MINIMUM_LOCKED_DGD is locked]: locked success, but sender not yet a participant', async function () {
      const lastParticipatedQuarter = await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[0]);
      const lastQuarterThatRewardsWasUpdated = await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[0]);
      assert.deepEqual(lastParticipatedQuarter, bN(0));
      assert.deepEqual(lastQuarterThatRewardsWasUpdated, bN(0));
      const balance = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[0]);
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, balance, { from: addressOf.dgdHolders[0] });
      const amount = randomBigNumber(bN, configs(bN).CONFIG_MINIMUM_LOCKED_DGD);
      assert.deepEqual(await contracts.daoStakeLocking.lockDGD.call(
        amount,
        { from: addressOf.dgdHolders[0] },
      ), true);
      await contracts.daoStakeLocking.lockDGD(amount, { from: addressOf.dgdHolders[0] });
      const readRes = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[0]);
      assert.deepEqual(readRes[0], amount);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), amount);
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[0]), false);
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[0]), balance.minus(amount));
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address), amount);
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[0]), bN(0));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[0]), bN(0));
    });
    it('[amount equal to CONFIG_MINIMUM_LOCKED_DGD is locked]: locked success, sender is participant', async function () {
      const balance = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[1]);
      const initialBalance = await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address);
      const initialTotalLocked = await contracts.daoStakeStorage.totalLockedDGDStake.call();
      const amount = bN(3).times(configs(bN).CONFIG_MINIMUM_LOCKED_DGD);
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, amount, { from: addressOf.dgdHolders[1] });
      assert.deepEqual(await contracts.daoStakeLocking.lockDGD.call(
        amount,
        { from: addressOf.dgdHolders[1] },
      ), true);
      await contracts.daoStakeLocking.lockDGD(amount, { from: addressOf.dgdHolders[1] });
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[1]), balance.minus(amount));
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address), initialBalance.plus(amount));
      const readRes = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[1]);
      assert.deepEqual(readRes[0], amount);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), initialTotalLocked.plus(amount));
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[1]), bN(1));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[1]), bN(0));
      const effectiveLocked = await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.dgdHolders[1]);
      assert.isAtLeast(effectiveLocked.toNumber(), configs(bN).CONFIG_MINIMUM_LOCKED_DGD.toNumber());
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[1]), true);

      // addressOf.dgdHolders[3] also locks some DGDs
      // he/she never confirmContinuedParticipation in the next 2-3 quarters
      // we will then try to withdraw all the amount
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 18)), { from: addressOf.dgdHolders[3] });
      await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 18)), { from: addressOf.dgdHolders[3] });
    });
    it('[lock during main phase]: verify actual stake', async function () {
      const startOfDao = await contracts.daoStorage.startOfFirstQuarter.call();
      const initialStake1 = await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.badgeHolders[1]);
      const initialStake2 = await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.badgeHolders[2]);
      const totalLockedDGDStake = await contracts.daoStakeStorage.totalLockedDGDStake.call();
      await phaseCorrection(phases.MAIN_PHASE);
      await waitFor(2);
      const timeToNextPhase1 = getTimeToNextPhase(getCurrentTimestamp(), startOfDao.toNumber(), 10, 20);
      await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 18)), { from: addressOf.badgeHolders[1] });
      const stakeNow1 = await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.badgeHolders[1]);

      await waitFor(2);
      const timeToNextPhase2 = getTimeToNextPhase(getCurrentTimestamp(), startOfDao.toNumber(), 10, 20);
      await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 18)), { from: addressOf.badgeHolders[2] });
      const stakeNow2 = await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.badgeHolders[2]);

      const sentAmount = 10 * (10 ** 18);
      const added1 = bN(Math.floor((sentAmount * timeToNextPhase1) / 10));
      const added2 = bN(Math.floor((sentAmount * timeToNextPhase2) / 10));
      assert.deepEqual(stakeNow1.minus(initialStake1), added1);
      assert.deepEqual(stakeNow2.minus(initialStake2), added2);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), totalLockedDGDStake.plus(added1).plus(added2));

      // addressOf.dgdHolders[4] also locks some DGDs
      // he/she never confirmContinuedParticipation in the next 2-3 quarters
      // we will then try to withdraw all the amount
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 18)), { from: addressOf.dgdHolders[4] });
      await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 18)), { from: addressOf.dgdHolders[4] });
    });
    it('[confirmContinuedParticipation during the same main phase]: nothing really happens', async function () {
      // person in consideration is addressOf.badgeHolders[1] and addressOf.badgeHolders[2]
      const initialStake1 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[1]);
      const initialStake2 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[2]);
      assert.notDeepEqual(initialStake1[0], initialStake1[1]);
      assert.notDeepEqual(initialStake2[0], initialStake2[1]);
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[1] });
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[2] });
      const nowStake1 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[1]);
      const nowStake2 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[2]);
      assert.deepEqual(nowStake1[0], initialStake1[0]);
      assert.deepEqual(nowStake1[1], initialStake1[1]);
      assert.deepEqual(nowStake2[0], initialStake2[0]);
      assert.deepEqual(nowStake2[1], initialStake2[1]);
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.badgeHolders[1]), bN(1));
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.badgeHolders[2]), bN(1));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.badgeHolders[1]), bN(0));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.badgeHolders[2]), bN(0));
      // so nothing has really changed
    });
  });

  describe('lockBadge | confirmContinuedParticipation', function () {
    before(async function () {
      await phaseCorrection(phases.LOCKING_PHASE);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter({ from: addressOf.founderBadgeHolder });
    });
    it('[confirmContinuedParticipation during the next locking phase]: the partial DGD Stake is now total', async function () {
      await phaseCorrection(phases.LOCKING_PHASE);
      const initialStake1 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[1]);
      const initialStake2 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[2]);
      assert.notDeepEqual(initialStake1[0], initialStake1[1]);
      assert.notDeepEqual(initialStake2[0], initialStake2[1]);
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[1] });
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[2] });
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolders[1] });
      const nowStake1 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[1]);
      const nowStake2 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[2]);
      assert.deepEqual(nowStake1[0], nowStake1[1]);
      assert.deepEqual(nowStake2[0], nowStake2[1]);
      assert.deepEqual(nowStake1[0], initialStake1[0]);
      assert.deepEqual(nowStake2[0], initialStake2[0]);
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.badgeHolders[1]), bN(2));
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.badgeHolders[2]), bN(2));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.badgeHolders[1]), bN(1));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.badgeHolders[2]), bN(1));
      // so the effective dgd stake is now increased, and lastParticipatedQuarter as well as lastQuarterThatRewardsWasUpdated is updated
    });
    it('[locking phase, amount = 0]: revert', async function () {
      assert(await a.failure(contracts.daoStakeLocking.lockBadge.call(
        bN(0),
        { from: addressOf.badgeHolders[2] },
      )));
    });
    it('[locking phase, not approved transfer, amount > 0]: revert', async function () {
      assert(await a.failure(contracts.daoStakeLocking.lockBadge.call(
        bN(1),
        { from: addressOf.badgeHolders[2] },
      )));
    });
    it('[locking phase, amount > 0]: add badge participant', async function () {
      assert.deepEqual(await contracts.daoStakeLocking.isBadgeParticipant.call(addressOf.badgeHolders[0]), false);
      const initialBalance = await contracts.badgeToken.balanceOf.call(addressOf.badgeHolders[0]);
      const initialContractBalance = await contracts.badgeToken.balanceOf.call(contracts.daoStakeLocking.address);
      const initialLockedBadges = await contracts.daoStakeStorage.readUserLockedBadge.call(addressOf.badgeHolders[0]);
      const initialTotalLockedBadges = await contracts.daoStakeStorage.totalLockedBadges.call();
      assert.isAtLeast(initialBalance.toNumber(), 1);
      const amount = bN(1);
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, amount, { from: addressOf.badgeHolders[0] });
      assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      assert.deepEqual(await contracts.daoStakeLocking.lockBadge.call(
        amount,
        { from: addressOf.badgeHolders[0] },
      ), true);
      await contracts.daoStakeLocking.lockBadge(amount, { from: addressOf.badgeHolders[0] });
      assert.deepEqual(await contracts.daoStakeStorage.readUserLockedBadge.call(addressOf.badgeHolders[0]), initialLockedBadges.plus(amount));
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedBadges.call(), initialTotalLockedBadges.plus(amount));
      assert.deepEqual(await contracts.badgeToken.balanceOf.call(addressOf.badgeHolders[0]), initialBalance.minus(amount));
      assert.deepEqual(await contracts.badgeToken.balanceOf.call(contracts.daoStakeLocking.address), initialContractBalance.plus(amount));
      assert.deepEqual(await contracts.daoStakeLocking.isBadgeParticipant.call(addressOf.badgeHolders[0]), true);

      // lock some more badges
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(2), { from: addressOf.badgeHolders[0] });
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(2), { from: addressOf.badgeHolders[1] });
      await contracts.daoStakeLocking.lockBadge(bN(2), { from: addressOf.badgeHolders[0] });
      await contracts.daoStakeLocking.lockBadge(bN(2), { from: addressOf.badgeHolders[1] });
    });
    it('[after locking phase has ended, valid amount]: revert', async function () {
      await phaseCorrection(phases.MAIN_PHASE);
      assert.deepEqual(await contracts.daoStakeLocking.isMainPhase.call(), true);

      // continue
      assert.isAtLeast((await contracts.badgeToken.balanceOf.call(addressOf.badgeHolders[1])).toNumber(), 1);
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(1), { from: addressOf.badgeHolders[1] });

      assert(await a.failure(contracts.daoStakeLocking.lockBadge.call(
        bN(1),
        { from: addressOf.badgeHolders[1] },
      )));
    });
  });

  describe('withdrawDGD', function () {
    before(async function () {
      await phaseCorrection(phases.LOCKING_PHASE);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter({ from: addressOf.founderBadgeHolder });
    });
    it('[withdraw more than locked amount]: revert', async function () {
      // dgdHolder2 is the user in context
      const lockedAmount = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[1]);
      assert(await a.failure(contracts.daoStakeLocking.isMainPhase.call()));
      assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      const withdrawAmount = lockedAmount[0].plus(bN(1));
      assert(await a.failure(contracts.daoStakeLocking.withdrawDGD.call(
        withdrawAmount,
        { from: addressOf.dgdHolders[1] },
      )));
    });
    it('[withdraw less than locked amount, still locked enough to be participant]: success, verify read functions', async function () {
      const lockedAmount = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[1]);
      // make sure its locking phase and dgdHolder2 is a participant already
      assert(await a.failure(contracts.daoStakeLocking.isMainPhase.call()));
      assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      // because currentQuarterIndex() is now +1 the lastParticipatedQuarter
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[1]), false);
      // if this amount is withdrawn, there will still be enough for dgdHolder2 to be participant
      const withdrawAmount = lockedAmount[0].minus(configs(bN).CONFIG_MINIMUM_LOCKED_DGD);

      // initial info
      const balanceBefore = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[1]);
      const contractBalanceBefore = await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address);
      const totalLockedDGDBefore = await contracts.daoStakeStorage.totalLockedDGDStake.call();

      assert.deepEqual(await contracts.daoStakeLocking.withdrawDGD.call(withdrawAmount, { from: addressOf.dgdHolders[1] }), true);
      await contracts.daoStakeLocking.withdrawDGD(withdrawAmount, { from: addressOf.dgdHolders[1] });

      // verify that dgdHolders[1] is still a participant
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[1]), true);
      // note the DGD balances
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address), contractBalanceBefore.minus(withdrawAmount));
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[1]), balanceBefore.plus(withdrawAmount));
      const readStake = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[1]);
      assert.deepEqual(readStake[0], lockedAmount[0].minus(withdrawAmount));
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), totalLockedDGDBefore.minus(withdrawAmount));
    });
    it('[withdraw less than locked amount, now should no more be a participant]: success, verify read functions', async function () {
      const lockedAmount = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[1]);
      // make sure its locking phase and dgdHolders[1] is a participant already
      assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[1]), true);
      // if this amount is withdrawn, there will still be enough for dgdHolder2 to be participant
      const withdrawAmount = randomBigNumber(bN, configs(bN).CONFIG_MINIMUM_LOCKED_DGD);

      // initial info
      const balanceBefore = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[1]);
      const contractBalanceBefore = await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address);
      const totalLockedDGDBefore = await contracts.daoStakeStorage.totalLockedDGDStake.call();

      assert.deepEqual(await contracts.daoStakeLocking.withdrawDGD.call(withdrawAmount, { from: addressOf.dgdHolders[1] }), true);
      await contracts.daoStakeLocking.withdrawDGD(withdrawAmount, { from: addressOf.dgdHolders[1] });

      // verify that dgdHolders[1] is still a participant
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[1]), false);
      // note the DGD balances
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address), contractBalanceBefore.minus(withdrawAmount));
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[1]), balanceBefore.plus(withdrawAmount));
      const readStake = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[1]);
      assert.deepEqual(readStake[0], lockedAmount[0].minus(withdrawAmount));
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), totalLockedDGDBefore.minus(withdrawAmount));
    });
    it('[withdraw during the main phase]: revert', async function () {
      await phaseCorrection(phases.MAIN_PHASE);
      assert.deepEqual(await contracts.daoStakeLocking.isMainPhase.call(), true);
      const lockedAmount = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[0]);
      const withdrawAmount = randomBigNumber(bN, lockedAmount[0]);
      assert(await a.failure(contracts.daoStakeLocking.withdrawDGD.call(
        withdrawAmount,
        { from: addressOf.dgdHolders[0] },
      )));
    });
  });

  describe('withdrawBadge', function () {
    before(async function () {
      await phaseCorrection(phases.LOCKING_PHASE);
    });
    it('[withdraw more than locked amount]: revert', async function () {
      assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);

      const lockedBadges = await contracts.daoStakeStorage.readUserLockedBadge.call(addressOf.badgeHolders[0]);
      const withdrawAmount = lockedBadges.plus(bN(1));
      assert(await a.failure(contracts.daoStakeLocking.withdrawBadge.call(
        withdrawAmount,
        { from: addressOf.badgeHolders[0] },
      )));
    });
    it('[withdraw less than locked amount, still badge participant]: success, verify read functions', async function () {
      const lockedBadges = await contracts.daoStakeStorage.readUserLockedBadge.call(addressOf.badgeHolders[0]);
      assert.isAtLeast(lockedBadges.toNumber(), 2);
      const withdrawAmount = lockedBadges.minus(bN(1));
      // values before withdrawal
      const balanceBefore = await contracts.badgeToken.balanceOf.call(addressOf.badgeHolders[0]);
      const totalLockedBadgesBefore = await contracts.daoStakeStorage.totalLockedBadges.call();

      assert.deepEqual(await contracts.daoStakeLocking.withdrawBadge.call(
        withdrawAmount,
        { from: addressOf.badgeHolders[0] },
      ), true);
      await contracts.daoStakeLocking.withdrawBadge(withdrawAmount, { from: addressOf.badgeHolders[0] });

      // make sure still a participant
      assert.deepEqual(await contracts.daoStakeLocking.isBadgeParticipant.call(addressOf.badgeHolders[0]), true);
      assert.deepEqual(await contracts.badgeToken.balanceOf.call(addressOf.badgeHolders[0]), balanceBefore.plus(withdrawAmount));
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedBadges.call(), totalLockedBadgesBefore.minus(withdrawAmount));
    });
    it('[withdraw all badges, now should no more be a badge participant]: success, verify read functions', async function () {
      const lockedBadges = await contracts.daoStakeStorage.readUserLockedBadge.call(addressOf.badgeHolders[0]);
      assert.deepEqual(await contracts.daoStakeLocking.withdrawBadge.call(
        lockedBadges,
        { from: addressOf.badgeHolders[0] },
      ), true);
      await contracts.daoStakeLocking.withdrawBadge(lockedBadges, { from: addressOf.badgeHolders[0] });

      // no more a badge participant
      assert.deepEqual(await contracts.daoStakeLocking.isBadgeParticipant.call(addressOf.badgeHolders[0]), false);
    });
    it('[withdraw during the main phase]: revert', async function () {
      // badgeHolder2 trying to withdraw
      assert.deepEqual(await contracts.daoStakeLocking.withdrawBadge.call(
        bN(1),
        { from: addressOf.badgeHolders[1] },
      ), true);

      // wait for main phase
      await phaseCorrection(phases.MAIN_PHASE);
      assert.deepEqual(await contracts.daoStakeLocking.isMainPhase.call(), true);

      // badgeHolder2 trying to withdraw, should fail
      assert(await a.failure(contracts.daoStakeLocking.withdrawBadge.call(
        bN(1),
        { from: addressOf.badgeHolders[1] },
      )));
    });
  });

  describe('withdrawDGD (additional scenario)', function () {
    before(async function () {
      await phaseCorrection(phases.LOCKING_PHASE);
      await waitFor(1);
      await phaseCorrection(phases.MAIN_PHASE);
      await waitFor(1);
      await phaseCorrection(phases.LOCKING_PHASE);
    });
    it('unlock dgds that were staked 2 quarters ago and never continued participation', async function () {
      const stake3 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[3]);
      const stake4 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[4]);
      await contracts.daoStakeLocking.withdrawDGD(stake3[0], { from: addressOf.dgdHolders[3] });
      await contracts.daoStakeLocking.withdrawDGD(stake4[0], { from: addressOf.dgdHolders[4] });
    });
  });
});
