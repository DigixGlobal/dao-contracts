const a = require('awaiting');

const {
  deployFreshDao,
  waitFor,
  phaseCorrection,
  initialTransferTokens,
  setupParticipantsStates,
  getParticipants,
  updateKyc,
} = require('../setup');

const {
  phases,
  getTimeToNextPhase,
  sampleStakeWeights,
  daoConstantsKeys,
  daoConstantsValues,
} = require('../daoHelpers');

const {
  randomBigNumber,
  getCurrentTimestamp,
  timeIsRecent,
  randomBytes32,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoStakeLocking', function (accounts) {
  const libs = {};
  const contracts = {};
  const addressOf = {};

  before(async function () {
    await deployFreshDao(libs, contracts, addressOf, accounts, bN, web3);
    assert.deepEqual(timeIsRecent(await contracts.daoUpgradeStorage.startOfFirstQuarter.call()), true);
    await initialTransferTokens(contracts, addressOf, bN);
  });

  const resetBeforeEach = async function () {
    await deployFreshDao(libs, contracts, addressOf, accounts, bN, web3);
    await setupParticipantsStates(web3, contracts, addressOf, bN);
    await contracts.daoIdentity.addGroupUser(bN(3), addressOf.prl, randomBytes32());
    await contracts.daoIdentity.addGroupUser(bN(4), addressOf.kycadmin, randomBytes32());
    await updateKyc(contracts, addressOf, getParticipants(addressOf, bN));
  };

  describe('redeemBadge', function () {
    it('[not approved DGDBadge]: revert', async function () {
      assert(await a.failure(contracts.daoStakeLocking.redeemBadge.call({ from: addressOf.badgeHolders[2] })));
    });
    it('[redeem badge when own more than 1 badges and all have been approved]: only 1 accepted, check reputation', async function () {
      // badgeHolders[2]
      const balanceBefore = await contracts.badgeToken.balanceOf.call(addressOf.badgeHolders[2]);
      const repBefore = await contracts.daoPointsStorage.getReputation.call(addressOf.badgeHolders[2]);
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(3), { from: addressOf.badgeHolders[2] });
      await contracts.daoStakeLocking.redeemBadge({ from: addressOf.badgeHolders[2] });
      const balanceAfter = await contracts.badgeToken.balanceOf.call(addressOf.badgeHolders[2]);
      assert.deepEqual(balanceAfter, balanceBefore.minus(bN(1)));
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.badgeHolders[2]), repBefore.plus(bN(1000)));
    });
    it('[redeem badges from same address again]: revert', async function () {
      assert(await a.failure(contracts.daoStakeLocking.redeemBadge.call({ from: addressOf.badgeHolders[2] })));
    });
  });

  describe('lockDGD | confirmContinuedParticipation', function () {
    before(async function () {
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: addressOf.badgeHolders[1] });
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: addressOf.badgeHolders[2] });
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
      const amount = randomBigNumber(bN, daoConstantsValues(bN).CONFIG_MINIMUM_LOCKED_DGD);
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
      const amount = bN(3).times(daoConstantsValues(bN).CONFIG_MINIMUM_LOCKED_DGD);
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
      assert.isAtLeast(effectiveLocked.toNumber(), daoConstantsValues(bN).CONFIG_MINIMUM_LOCKED_DGD.toNumber());
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[1]), true);

      // addressOf.dgdHolders[3] also locks some DGDs
      // he/she never confirmContinuedParticipation in the next 2-3 quarters
      // we will then try to withdraw all the amount
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: addressOf.dgdHolders[3] });
      await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.dgdHolders[3] });
    });
    it('[locking amount equal to CONFIG_MINIMUM_DGD_FOR_MODERATOR, reputation less than CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR]', async function () {
      // consider addressOf.badgeHolders[3]
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(110 * (10 ** 9)), { from: addressOf.badgeHolders[3] });
      await contracts.daoPointsStorage.setRP(addressOf.badgeHolders[3], bN(99));
      await contracts.daoStakeLocking.lockDGD(bN(110 * (10 ** 9)), { from: addressOf.badgeHolders[3] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[3]), false);
      assert.deepEqual(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call(), bN(0));
    });
    it('[increased reputation to CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR, now try to confirmContinuedParticipation]', async function () {
      await contracts.daoPointsStorage.setRP(addressOf.badgeHolders[3], bN(100));
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[3] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[3]), true);
      assert.deepEqual(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call(), bN(110 * (10 ** 9)));
      // this user now has no Quarter points, so in the next quarter, 20 RP will be deducted
      // effectively, this user will not be a moderator when he confirms continue participation
    });
    it('[locking amount greater than CONFIG_MINIMUM_DGD_FOR_MODERATOR, reputation equal to CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR]', async function () {
      // consider addressOf.badgeHolders[2]
      const initial = await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call();
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(101 * (10 ** 9)), { from: addressOf.badgeHolders[2] });
      await contracts.daoPointsStorage.setRP(addressOf.badgeHolders[2], bN(101));
      await contracts.daoStakeLocking.lockDGD(bN(101 * (10 ** 9)), { from: addressOf.badgeHolders[2] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[2]), true);
      assert.deepEqual(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call(), initial.plus(bN(101 * (10 ** 9))));
    });
    it('[lock during main phase]: verify actual stake', async function () {
      const startOfDao = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      const initialStake1 = await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.badgeHolders[1]);
      const initialStake2 = await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.badgeHolders[2]);
      const totalLockedDGDStake = await contracts.daoStakeStorage.totalLockedDGDStake.call();
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await waitFor(2, addressOf, web3);
      const timeToNextPhase1 = getTimeToNextPhase(getCurrentTimestamp(), startOfDao.toNumber(), lockingPhaseDuration.toNumber(), quarterDuration.toNumber());
      await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.badgeHolders[1] });
      const stakeNow1 = await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.badgeHolders[1]);

      await waitFor(2, addressOf, web3);
      const timeToNextPhase2 = getTimeToNextPhase(getCurrentTimestamp(), startOfDao.toNumber(), lockingPhaseDuration.toNumber(), quarterDuration.toNumber());
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: addressOf.badgeHolders[2] });
      await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.badgeHolders[2] });
      const stakeNow2 = await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.badgeHolders[2]);

      const sentAmount = 10 * (10 ** 9);
      const added1 = bN(Math.floor((sentAmount * timeToNextPhase1) / 50));
      const added2 = bN(Math.floor((sentAmount * timeToNextPhase2) / 50));
      assert.deepEqual(stakeNow1.minus(initialStake1), added1);
      assert.deepEqual(stakeNow2.minus(initialStake2), added2);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), totalLockedDGDStake.plus(added1).plus(added2));

      // addressOf.dgdHolders[4] also locks some DGDs
      // he/she never confirmContinuedParticipation in the next 2-3 quarters
      // we will then try to withdraw all the amount
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: addressOf.dgdHolders[4] });
      await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.dgdHolders[4] });
    });
    it('[lock 100 dgd during main phase, confirmContinuedParticipation in the next locking phase should give moderator status]', async function () {
      // addressOf.badgeHolders[1]
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(100 * (10 ** 9)), { from: addressOf.badgeHolders[1] });
      await contracts.daoPointsStorage.setRP(addressOf.badgeHolders[1], bN(200));

      await contracts.daoStakeLocking.lockDGD(bN(100 * (10 ** 9)), { from: addressOf.badgeHolders[1] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[1]), false);
    });
    it('[moderator with 250 DGDs (effective != total, effective > 100)]: added as moderator, check totalModeratorLockedDGDStake when withdraws next locking phase', async function () {
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(250 * (10 ** 9)), { from: addressOf.badgeHolders[0] });
      await contracts.daoPointsStorage.setRP(addressOf.badgeHolders[0], bN(101));
      await contracts.daoStakeLocking.lockDGD(bN(250 * (10 ** 9)), { from: addressOf.badgeHolders[0] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[0]), true);
    });
    it('[dgdHolders[5] locking > 100 dgds (main phase), confirms continue participation next locking]: see how the totalModeratorLockedDGDStake increases', async function () {
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(180 * (10 ** 9)), { from: addressOf.dgdHolders[5] });
      await contracts.daoPointsStorage.setRP(addressOf.dgdHolders[5], 200);
      await contracts.daoStakeLocking.lockDGD(bN(180 * (10 ** 9)), { from: addressOf.dgdHolders[5] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.dgdHolders[5]), true);
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

  describe('withdrawDGD', function () {
    before(async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
    });
    it('[confirmContinuedParticipation]: badgeHolders[1] --> moderator, badgeHolders[3] --> no moderator', async function () {
      const initial = await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call();
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[1] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[1]), true);
      assert.deepEqual(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call(), initial.plus(bN(110 * (10 ** 9))));

      const middle = await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call();
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[3] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[3]), false);
      assert.deepEqual(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call(), middle.minus(bN(110 * (10 ** 9))));
    });
    it('[badgeHolders[0] now withdraws all 250 DGDs]: totalModeratorLockedDGDStake should only change by effective DGDs (which is < 250 DGDs)', async function () {
      const stake = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[0]);
      const effectiveStake = stake[1];
      const totalActualStake = stake[0];
      const initial = await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call();
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[0]), true);
      await contracts.daoStakeLocking.withdrawDGD(totalActualStake, { from: addressOf.badgeHolders[0] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[0]), false);
      const stakeAfter = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[0]);
      assert.deepEqual(stakeAfter[1], bN(0));
      assert.deepEqual(stakeAfter[0], bN(0));
      assert.deepEqual(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call(), initial.minus(effectiveStake));
    });
    it('[dgdHolders[5] now confirms participation]: totalModeratorLockedDGDStake should go up', async function () {
      const userStakeBefore = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[5]);
      const stakeDiffDueToMainPhaseStaking = userStakeBefore[0].minus(userStakeBefore[1]);
      const totalModeratorLockedDGDStakeBefore = await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call();

      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolders[5] });

      const userStakeAfter = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[5]);
      const totalModeratorLockedDGDStakeAfter = await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call();

      assert.deepEqual(totalModeratorLockedDGDStakeAfter, totalModeratorLockedDGDStakeBefore.plus(stakeDiffDueToMainPhaseStaking));
      assert.deepEqual(userStakeAfter[0], userStakeBefore[0]);
      assert.deepEqual(userStakeAfter[0], userStakeAfter[1]);
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
      const withdrawAmount = lockedAmount[0].minus(daoConstantsValues(bN).CONFIG_MINIMUM_LOCKED_DGD);

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
      const withdrawAmount = randomBigNumber(bN, daoConstantsValues(bN).CONFIG_MINIMUM_LOCKED_DGD);

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
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      assert.deepEqual(await contracts.daoStakeLocking.isMainPhase.call(), true);
      const lockedAmount = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[0]);
      const withdrawAmount = randomBigNumber(bN, lockedAmount[0]);
      assert(await a.failure(contracts.daoStakeLocking.withdrawDGD.call(
        withdrawAmount,
        { from: addressOf.dgdHolders[0] },
      )));
    });
  });

  describe('withdrawDGD (additional scenario)', function () {
    before(async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await waitFor(1, addressOf, web3);
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await waitFor(1, addressOf, web3);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
    });
    it('unlock dgds that were staked 2 quarters ago and never continued participation', async function () {
      const stake3 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[3]);
      const stake4 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[4]);
      await contracts.daoStakeLocking.withdrawDGD(stake3[0], { from: addressOf.dgdHolders[3] });
      await contracts.daoStakeLocking.withdrawDGD(stake4[0], { from: addressOf.dgdHolders[4] });
    });
  });

  describe('other scenarios', function () {
    beforeEach(async function () {
      await resetBeforeEach();
    });
    it('[activity before global rewards are calculated in quarter 2 locking phase]: revert all', async function () {
      const participants = getParticipants(addressOf, bN);
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);

      // try to withdraw DGDs before global rewards are updated
      assert(await a.failure(contracts.daoStakeLocking.withdrawDGD(
        participants[0].dgdToLock,
        { from: participants[0].address },
      )));

      // try to lock DGDs
      await contracts.dgdToken.transfer(addressOf.allParticipants[2], sampleStakeWeights(bN)[2]);
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(2 ** 255), { from: addressOf.allParticipants[2] });
      assert(await a.failure(contracts.daoStakeLocking.lockDGD(sampleStakeWeights(bN)[2], { from: addressOf.allParticipants[2] })));

      // try to continue participation
      assert(await a.failure(contracts.daoStakeLocking.confirmContinuedParticipation({ from: participants[1].address })));
    });
  });

  describe('redeemBadge (additional scenario)', function () {
    let participants;
    beforeEach(async function () {
      await resetBeforeEach();
      participants = getParticipants(addressOf, bN);
    });
    it('[redeem just after calculateGlobalRewardsBeforeNewQuarter, but before calculating own rewards/reputation]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);

      // founder calls the calculateGlobalRewardsBeforeNewQuarter
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      // make sure participants[2] has a badge and has not already redeemed one
      assert.deepEqual(await contracts.daoStakeStorage.redeemedBadge.call(participants[2].address), false);
      const badgeBalance = await contracts.badgeToken.balanceOf.call(participants[2].address);
      assert.isAtLeast(badgeBalance.toNumber(), 1);
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(1), { from: participants[2].address });

      // participants[2] is already a participant, tries to redeem a badge
      assert(await a.failure(contracts.daoStakeLocking.redeemBadge({ from: participants[2].address })));

      // now calculate own rewards/reputation
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: participants[2].address });

      // now can redeem the badge
      await contracts.daoStakeLocking.redeemBadge({ from: participants[2].address });
    });
    it('[redeem just after calculateGlobalRewardsBeforeNewQuarter, before calculating own rewards/reputation, but is first quarter of participation]: success', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);

      // founder calls the calculateGlobalRewardsBeforeNewQuarter
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      // make sure addressOf.dgdHolders[5] has a badge and has not already redeemed one
      await contracts.badgeToken.transfer(addressOf.dgdHolders[5], bN(1), { from: addressOf.root });
      assert.deepEqual(await contracts.daoStakeStorage.redeemedBadge.call(addressOf.dgdHolders[5]), false);
      const badgeBalance = await contracts.badgeToken.balanceOf.call(addressOf.dgdHolders[5]);
      assert.isAtLeast(badgeBalance.toNumber(), 1);
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(1), { from: addressOf.dgdHolders[5] });

      // this user has never participated in DigixDAO
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[5]), bN(0));

      // addressOf.dgdHolders[5] is should be able to redeem badge
      assert.ok(await contracts.daoStakeLocking.redeemBadge({ from: addressOf.dgdHolders[5] }));
    });
    it('[user already has more than enough DGDs locked to be moderator, now redeems badge]: is added as moderator', async function () {
      // make sure participants[2] is not already a moderator
      assert.deepEqual(await contracts.daoStakeLocking.isModerator.call(participants[2].address), false);

      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(200 * (10 ** 9)), { from: participants[2].address });
      await contracts.daoStakeLocking.lockDGD(bN(200 * (10 ** 9)), { from: participants[2].address });

      // make sure participants[2] still is not moderator
      assert.deepEqual(await contracts.daoStakeLocking.isModerator.call(participants[2].address), false);

      // now redeems his badge
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(1), { from: participants[2].address });
      await contracts.daoStakeLocking.redeemBadge({ from: participants[2].address });

      // now check if moderator, should be
      assert.deepEqual(await contracts.daoStakeLocking.isModerator.call(participants[2].address), true);
    });
  });
});
