const a = require('awaiting');

const {
  deployFreshDao,
  waitFor,
  phaseCorrection,
  initialTransferTokens,
  setupParticipantsStates,
  getParticipants,
  updateKyc,
  printDaoDetails,
  checkDgdStakeConsistency,
  printHolderDetails,
  printBadgeHolderDetails,
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
  randomAddress,
  getCurrentTimestamp,
  timeIsRecent,
  randomBytes32,
  indexRange,
} = require('@digix/helpers/lib/helpers');

const MockDaoFundingManager = artifacts.require('MockDaoFundingManager.sol');

const bN = web3.toBigNumber;
const MAIN_PHASE_DURATION_1 = 40;
const MAIN_PHASE_DURATION_2 = 15;

contract('DaoStakeLocking', function (accounts) {
  const libs = {};
  const contracts = {};
  const addressOf = {};

  before(async function () {
    await deployFreshDao(libs, contracts, addressOf, accounts, bN, web3, 15, MAIN_PHASE_DURATION_1);
    assert.deepEqual(timeIsRecent(await contracts.daoUpgradeStorage.startOfFirstQuarter.call()), true);
    await initialTransferTokens(contracts, addressOf, bN);
  });

  const resetBeforeEach = async function () {
    await deployFreshDao(libs, contracts, addressOf, accounts, bN, web3, 15, MAIN_PHASE_DURATION_2);

    // set that addressOf.dgdHolders[0] and [1] participated in carbon voting 1,2 and 1 respectively
    await contracts.carbonVoting1.mock_set_voted(addressOf.dgdHolders[0]);
    await contracts.carbonVoting1.mock_set_voted(addressOf.dgdHolders[1]);
    await contracts.carbonVoting2.mock_set_voted(addressOf.dgdHolders[0]);

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
      await contracts.daoStakeLocking.lockDGD(amount, { from: addressOf.dgdHolders[0] });
      const readRes = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[0]);
      assert.deepEqual(readRes[0], amount);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), bN(0));
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
      await contracts.daoStakeLocking.lockDGD(amount, { from: addressOf.dgdHolders[1] });
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[1]), balance.minus(amount));
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address), initialBalance.plus(amount));
      const readRes = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[1]);
      assert.deepEqual(readRes[0], amount);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), initialTotalLocked.plus(amount));
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[1]), bN(1));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[1]), bN(0));
      const effectiveLocked = await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.dgdHolders[1]);
      assert.isAtLeast(effectiveLocked.toNumber(), daoConstantsValues(bN).CONFIG_MINIMUM_LOCKED_DGD.toNumber());
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[1]), true);

      // addressOf.dgdHolders[3] also locks some DGDs
      // he/she never confirmContinuedParticipation in the next 2-3 quarters
      // we will then try to withdraw all the amount
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: addressOf.dgdHolders[3] });
      await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.dgdHolders[3] });
      await checkDgdStakeConsistency(contracts, bN);
    });
    it('[locking amount equal to CONFIG_MINIMUM_DGD_FOR_MODERATOR, reputation less than CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR]', async function () {
      // consider addressOf.badgeHolders[3]
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(110 * (10 ** 9)), { from: addressOf.badgeHolders[3] });
      await contracts.daoPointsStorage.setRP(addressOf.badgeHolders[3], bN(99));
      await contracts.daoStakeLocking.lockDGD(bN(110 * (10 ** 9)), { from: addressOf.badgeHolders[3] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[3]), false);
      assert.deepEqual(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call(), bN(0));
      await checkDgdStakeConsistency(contracts, bN);
    });
    it('[increased reputation to CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR, now try to confirmContinuedParticipation]', async function () {
      await contracts.daoPointsStorage.setRP(addressOf.badgeHolders[3], bN(100));
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[3] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[3]), true);
      assert.deepEqual(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call(), bN(110 * (10 ** 9)));
      // this user now has no Quarter points, so in the next quarter, 20 RP will be deducted
      // effectively, this user will not be a moderator when he confirms continue participation
      await checkDgdStakeConsistency(contracts, bN);
    });
    it('[locking amount greater than CONFIG_MINIMUM_DGD_FOR_MODERATOR, reputation equal to CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR]', async function () {
      // consider addressOf.badgeHolders[2]
      const initial = await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call();
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(101 * (10 ** 9)), { from: addressOf.badgeHolders[2] });
      await contracts.daoPointsStorage.setRP(addressOf.badgeHolders[2], bN(101));
      await contracts.daoStakeLocking.lockDGD(bN(101 * (10 ** 9)), { from: addressOf.badgeHolders[2] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[2]), true);
      assert.deepEqual(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call(), initial.plus(bN(101 * (10 ** 9))));
      await checkDgdStakeConsistency(contracts, bN);
    });
    it('[lock during main phase]: verify actual stake', async function () {
      const startOfDao = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      const initialStake1 = await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.badgeHolders[1]);
      const initialStake2 = await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.badgeHolders[2]);
      const totalLockedDGDStake = await contracts.daoStakeStorage.totalLockedDGDStake.call();
      await printBadgeHolderDetails(contracts, addressOf);
      await printHolderDetails(contracts, addressOf);
      await printDaoDetails(bN, contracts);
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);

      await waitFor(2, addressOf, web3);
      const timeNow = getCurrentTimestamp();
      const timeToNextPhase1 = getTimeToNextPhase(timeNow, startOfDao.toNumber(), lockingPhaseDuration.toNumber(), quarterDuration.toNumber());
      await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.badgeHolders[1] });
      // console.log('tx = ', tx);
      // console.log('timeNow = ', timeNow);

      const stakeNow1 = await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.badgeHolders[1]);

      await waitFor(2, addressOf, web3);
      const timeToNextPhase2 = getTimeToNextPhase(getCurrentTimestamp(), startOfDao.toNumber(), lockingPhaseDuration.toNumber(), quarterDuration.toNumber());
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: addressOf.badgeHolders[2] });
      await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.badgeHolders[2] });
      const stakeNow2 = await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.badgeHolders[2]);

      const sentAmount = 10 * (10 ** 9);
      const added1 = bN(Math.floor((sentAmount * timeToNextPhase1) / MAIN_PHASE_DURATION_1));
      const added2 = bN(Math.floor((sentAmount * timeToNextPhase2) / MAIN_PHASE_DURATION_1));
      assert.deepEqual(stakeNow1.minus(initialStake1), added1);
      assert.deepEqual(stakeNow2.minus(initialStake2), added2);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), totalLockedDGDStake.plus(added1).plus(added2));

      // addressOf.dgdHolders[4] also locks some DGDs
      // he/she never confirmContinuedParticipation in the next 2-3 quarters
      // we will then try to withdraw all the amount
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: addressOf.dgdHolders[4] });
      await contracts.daoStakeLocking.lockDGD(bN(10 * (10 ** 9)), { from: addressOf.dgdHolders[4] });
      await checkDgdStakeConsistency(contracts, bN);
    });
    it('[lock 100 dgd during main phase, confirmContinuedParticipation in the next locking phase should give moderator status]', async function () {
      // addressOf.badgeHolders[1]
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(100 * (10 ** 9)), { from: addressOf.badgeHolders[1] });
      await contracts.daoPointsStorage.setRP(addressOf.badgeHolders[1], bN(200));

      await contracts.daoStakeLocking.lockDGD(bN(100 * (10 ** 9)), { from: addressOf.badgeHolders[1] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[1]), false);
      await checkDgdStakeConsistency(contracts, bN);
    });
    it('[moderator with 250 DGDs (effective != total, effective > 100)]: added as moderator, check totalModeratorLockedDGDStake when withdraws next locking phase', async function () {
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(250 * (10 ** 9)), { from: addressOf.badgeHolders[0] });
      await contracts.daoPointsStorage.setRP(addressOf.badgeHolders[0], bN(101));
      await contracts.daoStakeLocking.lockDGD(bN(250 * (10 ** 9)), { from: addressOf.badgeHolders[0] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[0]), true);
      await checkDgdStakeConsistency(contracts, bN);
    });
    it('[dgdHolders[5] locking > 100 dgds (main phase), confirms continue participation next locking]: see how the totalModeratorLockedDGDStake increases', async function () {
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(180 * (10 ** 9)), { from: addressOf.dgdHolders[5] });
      await contracts.daoPointsStorage.setRP(addressOf.dgdHolders[5], 200);
      await contracts.daoStakeLocking.lockDGD(bN(180 * (10 ** 9)), { from: addressOf.dgdHolders[5] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.dgdHolders[5]), true);
      await checkDgdStakeConsistency(contracts, bN);
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
      await checkDgdStakeConsistency(contracts, bN);
    });
  });

  describe('withdrawDGD', function () {
    before(async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await printHolderDetails(contracts, addressOf);
    });
    afterEach(async () => {
      await checkDgdStakeConsistency(contracts, bN);
    });
    it('[confirmContinuedParticipation]: badgeHolders[1] --> moderator, badgeHolders[3] --> no moderator', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call(), bN(0)); // totalModeratorLockedDGDStake is reset to 0

      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[1] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[1]), true);
      assert.deepEqual(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call(), bN(110 * (10 ** 9)));

      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[3] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[3]), false);
      assert.deepEqual(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call(), bN(110 * (10 ** 9)));
    });
    it('[badgeHolders[0] now withdraws all 250 DGDs]: totalModeratorLockedDGDStake should only change by effective DGDs (which is < 250 DGDs)', async function () {
      await printHolderDetails(contracts, addressOf);
      const stake = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[0]);
      // const effectiveStake = stake[1];
      const totalActualStake = stake[0];
      const initial = await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call();
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[0]), true);
      await contracts.daoStakeLocking.withdrawDGD(totalActualStake, { from: addressOf.badgeHolders[0] });
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[0]), false);
      const stakeAfter = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[0]);
      assert.deepEqual(stakeAfter[1], bN(0));
      assert.deepEqual(stakeAfter[0], bN(0));
      assert.deepEqual(await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call(), initial);
    });
    it('[dgdHolders[5] now confirms participation]: totalModeratorLockedDGDStake should go up', async function () {
      const userStakeBefore = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[5]);
      const totalModeratorLockedDGDStakeBefore = await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call();

      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolders[5] });

      const userStakeAfter = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[5]);
      const totalModeratorLockedDGDStakeAfter = await contracts.daoStakeStorage.totalModeratorLockedDGDStake.call();

      assert.deepEqual(totalModeratorLockedDGDStakeAfter, totalModeratorLockedDGDStakeBefore.plus(userStakeAfter[1]));
      assert.deepEqual(userStakeAfter[0], userStakeBefore[0]);
      assert.deepEqual(userStakeAfter[0], userStakeAfter[1]);
    });
    it('[withdraw more than locked amount]: revert', async function () {
      // dgdHolder2 is the user in context
      const lockedAmount = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[1]);
      // assert(await a.failure(contracts.daoStakeLocking.isMainPhase.call()));
      // assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      const withdrawAmount = lockedAmount[0].plus(bN(1));
      assert(await a.failure(contracts.daoStakeLocking.withdrawDGD.call(
        withdrawAmount,
        { from: addressOf.dgdHolders[1] },
      )));
    });
    it('[withdraw less than locked amount, still locked enough to be participant]: success, verify read functions', async function () {
      // lets move to next quarter and lets badgeHolders[1] continue participation first
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      await printDaoDetails(bN, contracts);

      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[1] });

      const lockedAmount = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[1]);
      // make sure its locking phase and dgdHolder2 is a participant already
      // assert(await a.failure(contracts.daoStakeLocking.isMainPhase.call()));
      // assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      // because currentQuarterNumber() is now +1 the lastParticipatedQuarter
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[1]), false);
      // if this amount is withdrawn, there will still be enough for dgdHolder2 to be participant
      const withdrawAmount = lockedAmount[0].minus(daoConstantsValues(bN).CONFIG_MINIMUM_LOCKED_DGD);

      // initial info
      const balanceBefore = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[1]);
      const contractBalanceBefore = await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address);
      const totalLockedDGDBefore = await contracts.daoStakeStorage.totalLockedDGDStake.call();

      await contracts.daoStakeLocking.withdrawDGD(withdrawAmount, { from: addressOf.dgdHolders[1] });

      // verify that dgdHolders[1] is still a participant
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[1]), true);
      // note the DGD balances
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address), contractBalanceBefore.minus(withdrawAmount));
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[1]), balanceBefore.plus(withdrawAmount));
      const readStake = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[1]);
      assert.deepEqual(readStake[0], lockedAmount[0].minus(withdrawAmount));

      // totalLockedDGDStake increases by the new lockedStake of the participant
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), totalLockedDGDBefore.plus(readStake[1]));
    });
    it('[withdraw less than locked amount, now should no more be a participant]: success, verify read functions', async function () {
      const lockedAmount = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[1]);
      // make sure its locking phase and dgdHolders[1] is a participant already
      // assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[1]), true);
      // if this amount is withdrawn, there will still be enough for dgdHolder2 to be participant
      const withdrawAmount = randomBigNumber(bN, daoConstantsValues(bN).CONFIG_MINIMUM_LOCKED_DGD);

      // initial info
      const balanceBefore = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[1]);
      const contractBalanceBefore = await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address);
      const totalLockedDGDBefore = await contracts.daoStakeStorage.totalLockedDGDStake.call();

      await printDaoDetails(bN, contracts);
      await contracts.daoStakeLocking.withdrawDGD(withdrawAmount, { from: addressOf.dgdHolders[1] });

      // verify that dgdHolders[1] is still a participant
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[1]), false);
      // note the DGD balances
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(contracts.daoStakeLocking.address), contractBalanceBefore.minus(withdrawAmount));
      assert.deepEqual(await contracts.dgdToken.balanceOf.call(addressOf.dgdHolders[1]), balanceBefore.plus(withdrawAmount));
      const readStake = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[1]);
      assert.deepEqual(readStake[0], lockedAmount[0].minus(withdrawAmount));
      // since this address is no longer a participant, the totalLockedDGDStake should decrease by his initial lockedDGDStake
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), totalLockedDGDBefore.minus(lockedAmount[1]));
    });
    it('[withdraw during the main phase]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      // assert.deepEqual(await contracts.daoStakeLocking.isMainPhase.call(), true);
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
      await resetBeforeEach();
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      // console.log('1. current quarter = ', await contracts.dao.currentQuarterNumber.call());

      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(15 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(30), { from: addressOf.founderBadgeHolder });
      await contracts.dgdToken.transfer(addressOf.dgdHolders[3], bN(50e9), { from: addressOf.dgdHolders[0] });
      await contracts.dgdToken.transfer(addressOf.dgdHolders[4], bN(50e9), { from: addressOf.dgdHolders[0] });
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(200 * (10 ** 9)), { from: addressOf.dgdHolders[3] });
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(200 * (10 ** 9)), { from: addressOf.dgdHolders[4] });

      await contracts.daoStakeLocking.lockDGD(bN(20 * (10 ** 9)), { from: addressOf.dgdHolders[3] });
      await contracts.daoStakeLocking.lockDGD(bN(20 * (10 ** 9)), { from: addressOf.dgdHolders[4] });

      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(30), { from: addressOf.founderBadgeHolder });

      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(15 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(30), { from: addressOf.founderBadgeHolder });
      // console.log('2. Calculated global ,current quarter = ', await contracts.dao.currentQuarterNumber.call());
    });
    afterEach(async () => {
      await checkDgdStakeConsistency(contracts, bN);
    });
    it('unlock dgds that were staked 2 quarters ago and never continued participation', async function () {
      const stake3 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[3]);
      const stake4 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[4]);
      await contracts.daoStakeLocking.withdrawDGD(stake3[0], { from: addressOf.dgdHolders[3] });
      await contracts.daoStakeLocking.withdrawDGD(stake4[0], { from: addressOf.dgdHolders[4] });
    });
    it('[confirmContinuedParticipation when lockedDGDStake < minimum DGD required]', async function () {
      await printBadgeHolderDetails(contracts, addressOf);
      await printHolderDetails(contracts, addressOf);
      const stake1 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[0]);
      const stake2 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.dgdHolders[1]);

      // holder1 withdraws DGD, leaving only 0.5DGD, hence, is not a participant in this quarter N
      await printDaoDetails(bN, contracts);
      await contracts.daoStakeLocking.withdrawDGD(stake1[0].minus(0.5e9), { from: addressOf.dgdHolders[0] });
      // holder2 withdraws DGD, leaving only 1DGD, hence, is a participant in this quarter N
      await contracts.daoStakeLocking.withdrawDGD(stake2[0].minus(1e9), { from: addressOf.dgdHolders[1] });

      await checkDgdStakeConsistency(contracts, bN);

      // now, lets teleport to quarter N + 1
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);

      // await printBadgeHolderDetails(contracts, addressOf);
      // await printDaoDetails(bN, contracts);

      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(15 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(30), { from: addressOf.founderBadgeHolder });

      // now, holder1 tries to confirmContinuedParticipation. His lockedDGDStake should still be 0.5, and the totalLockedDGDStake should still be 0
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolders[0] });
      assert.deepEqual(await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.dgdHolders[0]), bN(0.5e9));
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), bN(0));

      await checkDgdStakeConsistency(contracts, bN);

      // setup for next test case: one of the two moderators withdraw his DGD
      const stakeHolder0 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[0]);
      await contracts.daoStakeLocking.withdrawDGD(stakeHolder0[0], { from: addressOf.badgeHolders[0] });
      // End setup for next test case

      // now, lets teleport to the middle  of Mainphase of quarter N+1;
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await waitFor(2, addressOf, web3);

      // now, holder2 tries to confirmContinuedParticipation. His lockedDGDStake should be less than 1DGD, and the totalLockedDGDStake should still be 0 as well
      // since this guy will not be considered a participant
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolders[1] });

      assert.deepEqual((await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.dgdHolders[1])).lt(1e9), true);
      assert.deepEqual(await contracts.daoStakeStorage.totalLockedDGDStake.call(), bN(0));
    });
    it('calculateGlobalRewardsBeforeNewQuarter could execute with one moderator; last moderator cannot withdraw DGDs to become non-moderator', async function () {
      // now, only badgeHolders[1] is in the moderator list
      assert.deepEqual(await contracts.daoStakeStorage.readTotalModerators.call(), bN(1)); // make sure that there is one moderator left
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);

      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(30), { from: addressOf.founderBadgeHolder });

      const stakeHolder1 = await contracts.daoStakeStorage.readUserDGDStake.call(addressOf.badgeHolders[1]);
      assert.ok(await a.failure(contracts.daoStakeLocking.withdrawDGD(stakeHolder1[0], { from: addressOf.badgeHolders[1] })));
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
    it('[lock and withdraw all DGDs within locking phase of the same quarter]: lastParticipatedQuarter should be the previous one', async function () {
      // say the participant never participated in quarter 1
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      // mark beginning of new quarter
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(15 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      // consider addressOf.dgdHolders[0] who participated in quarter 1
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[0]), bN(1));
      assert.deepEqual(await contracts.daoRewardsStorage.previousLastParticipatedQuarter.call(addressOf.dgdHolders[0]), bN(0));
      const stake0 = await contracts.daoStakeStorage.actualLockedDGD.call(addressOf.dgdHolders[0]);
      // make sure its greater than 2 DGDs
      assert.isAbove(stake0.toNumber(), 2 * (10 ** 9));
      // withdraw 1 DGD (the remaining DGDs mean this user is still a participant)
      await contracts.daoStakeLocking.withdrawDGD(bN(1 * (10 ** 9)), { from: addressOf.dgdHolders[0] });
      // but this means their participation has been renewed for quarter 2
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[0]), bN(2));
      assert.deepEqual(await contracts.daoRewardsStorage.previousLastParticipatedQuarter.call(addressOf.dgdHolders[0]), bN(1));
      // in the same quarter, this person can now withdraw all their DGDs
      await contracts.daoStakeLocking.withdrawDGD(stake0.minus(bN(1 * (10 ** 9))), { from: addressOf.dgdHolders[0] });
      // if all are withdrawn, this person is no longer a participant in this quarter
      // lastParticipatedQuarter must be set back to 1
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[0]), bN(1));

      // consider addressOf.dgdHolders[1] who participated in quarter 1
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[1]), bN(1));
      assert.deepEqual(await contracts.daoRewardsStorage.previousLastParticipatedQuarter.call(addressOf.dgdHolders[1]), bN(0));
      const stake1 = await contracts.daoStakeStorage.actualLockedDGD.call(addressOf.dgdHolders[1]);
      // this person continues participation in DigixDAO
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolders[1] });
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[1]), bN(2));
      assert.deepEqual(await contracts.daoRewardsStorage.previousLastParticipatedQuarter.call(addressOf.dgdHolders[1]), bN(1));
      // now they withdraw everything

      await contracts.daoStakeLocking.withdrawDGD(stake1, { from: addressOf.dgdHolders[1] });
      // the lastParticipatedQuarter should be set back to 1
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[1]), bN(1));

      // everybody continues participation in DigixDAO
      const participants = getParticipants(addressOf, bN);
      await a.map(indexRange(0, participants.length), 20, async (index) => {
        const stakeTemp = await contracts.daoStakeStorage.actualLockedDGD.call(participants[index].address);
        if (stakeTemp.toNumber() === 0) return;
        await contracts.daoStakeLocking.confirmContinuedParticipation({ from: participants[index].address });
      });

      // wait for the next quarter's locking phase
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);

      // mark beginning of new quarter
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(15 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      // addressOf.dgdHolders[5] now tries to lock DGDs
      await contracts.dgdToken.transfer(addressOf.dgdHolders[5], bN(2 * (10 ** 9)));
      // has not participated yet
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[5]), bN(0));
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(2 * (10 ** 9)), { from: addressOf.dgdHolders[5] });
      await contracts.daoStakeLocking.lockDGD(bN(2 * (10 ** 9)), { from: addressOf.dgdHolders[5] });
      // has locked DGDs, so lastParticipatedQuarter should be 2
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[5]), bN(3));

      await contracts.daoStakeLocking.withdrawDGD(bN(2 * (10 ** 9)), { from: addressOf.dgdHolders[5] });
      // has withdrawn in the same quarter, the lastParticipatedQuarter must be 0 again
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[5]), bN(0));

      await checkDgdStakeConsistency(contracts, bN);
    });
    it('[locking DGDs, after participation in carbonvotings]: verify bonus reputation rewarded', async function () {
      // accounts[14] voted in carbonvoting1 and 2, locking enough DGDs to be participant
      // accounts[15] voted in carbonvoting1, locking less than minimum DGDs, then locking enough DGDs to be participant
      // accounts[16] did not vote in carbonvotings, locking enough DGDs to be participant
      // accounts[17] voted in carbonvoting1, locking and withdrawing everything, then locking again, should receive bonus only once

      // transfer tokens and approve
      await contracts.dgdToken.transfer(accounts[14], bN(10 * (10 ** 9)));
      await contracts.dgdToken.transfer(accounts[15], bN(10 * (10 ** 9)));
      await contracts.dgdToken.transfer(accounts[16], bN(10 * (10 ** 9)));
      await contracts.dgdToken.transfer(accounts[17], bN(10 * (10 ** 9)));
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: accounts[14] });
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: accounts[15] });
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: accounts[16] });
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10 * (10 ** 9)), { from: accounts[17] });

      // set initial carbonvoting states
      await contracts.carbonVoting1.mock_set_voted(accounts[14]);
      await contracts.carbonVoting2.mock_set_voted(accounts[14]);
      await contracts.carbonVoting1.mock_set_voted(accounts[15]);
      await contracts.carbonVoting1.mock_set_voted(accounts[17]);

      // wait for the next quarter, initialize next quarter
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(10 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      // mark initial states
      const rep14 = await contracts.daoPointsStorage.getReputation.call(accounts[14]);
      const rep15 = await contracts.daoPointsStorage.getReputation.call(accounts[15]);
      const rep16 = await contracts.daoPointsStorage.getReputation.call(accounts[16]);
      const rep17 = await contracts.daoPointsStorage.getReputation.call(accounts[17]);

      // accounts[14] tries to lock tokens
      await contracts.daoStakeLocking.lockDGD(bN(5 * (10 ** 9)), { from: accounts[14] });

      // accounts[15] tries to lock very less tokens (not enough to be participant)
      await contracts.daoStakeLocking.lockDGD(bN(10000), { from: accounts[15] });

      // accounts[16] locks enough tokens
      await contracts.daoStakeLocking.lockDGD(bN(5 * (10 ** 9)), { from: accounts[16] });

      // accounts[17] locls enough tokens
      await contracts.daoStakeLocking.lockDGD(bN(5 * (10 ** 9)), { from: accounts[17] });

      // verify new reputation (250 reputation is awarded for every carbonvote)
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(accounts[14]), rep14.plus(bN(70)));
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(accounts[15]), rep15);
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(accounts[16]), rep16);
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(accounts[17]), rep17.plus(bN(35)));

      // now accounts[15] locks some more tokens (enough to be participant)
      // will get 250 reputation for their single carbonvote activity
      await contracts.daoStakeLocking.lockDGD(bN(2 * (10 ** 9)), { from: accounts[15] });
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(accounts[15]), rep15.plus(bN(35)));

      // even if accounts[14] or [15] lock more tokens, they don't get any additional reputation
      // because they have already once received it
      // accounts[17] withdraws everything
      await contracts.daoStakeLocking.lockDGD(bN(2 * (10 ** 9)), { from: accounts[14] });
      await contracts.daoStakeLocking.lockDGD(bN(2 * (10 ** 9)), { from: accounts[15] });
      await printDaoDetails(bN, contracts);
      await contracts.daoStakeLocking.withdrawDGD(bN(5 * (10 ** 9)), { from: accounts[17] });
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(accounts[14]), rep14.plus(bN(70)));
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(accounts[15]), rep15.plus(bN(35)));
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(accounts[17]), rep17.plus(bN(35)));

      // initialize next quarter
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(10 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      // accounts[14] locks some more tokens in this new quarter 3
      const rep14Before = await contracts.daoPointsStorage.getReputation.call(accounts[14]);
      await contracts.daoStakeLocking.lockDGD(bN(3 * (10 ** 9)), { from: accounts[14] });
      // since accounts[14] has 0 quarter points in quarter 2, this person must be
      // reduced reputation by CONFIG_MAXIMUM_REPUTATION_DEDUCTION (i.e. 20)
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(accounts[14]), rep14Before.minus(bN(20)));

      // accounts[15] locks some more tokens in this new quarter 3
      const rep15Before = await contracts.daoPointsStorage.getReputation.call(accounts[15]);
      // set the quarter point to 5 for quarter 2
      await contracts.daoPointsStorage.mock_set_qp([accounts[15]], [bN(5)], bN(2));
      // lock dgds
      await contracts.daoStakeLocking.lockDGD(bN(3 * (10 ** 9)), { from: accounts[15] });
      // accordingly, the reputation must go up by (5 - 3)*1/1 = 2
      // must not receive the bonus reputation for carbon voting now
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(accounts[15]), rep15Before.plus(bN(2)));

      // accounts[17] locks again, reputation will be deducted by the (fine + max_deduction)
      await contracts.daoStakeLocking.lockDGD(bN(5 * (10 ** 9)), { from: accounts[17] });
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(accounts[17]), rep17.plus(bN(35)).minus(bN(25)));

      await checkDgdStakeConsistency(contracts, bN);
    });
    it('[last moderator should not be able to withdraw DGDs, unless DigixDAO is replaced/migrated to new one]', async function () {
      const moderators = await contracts.daoListingService.listModerators.call(bN(20), true);

      // say the participant never participated in quarter 1
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      // mark beginning of new quarter
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(15 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      for (const moderator of moderators) {
        if (moderator !== moderators[moderators.length - 1]) {
          const amount = await contracts.daoStakeStorage.actualLockedDGD.call(moderator);
          await contracts.daoStakeLocking.withdrawDGD(amount, { from: moderator });
        }
      }

      // now try to withdraw for final moderator. It should fail
      // the last moderator can only withdraw after migration of this DAO
      const amount = await contracts.daoStakeStorage.actualLockedDGD.call(moderators[moderators.length - 1]);
      assert(await a.failure(contracts.daoStakeLocking.withdrawDGD.call(amount, { from: moderators[moderators.length - 1] })));

      // migrate to new set of contracts
      const newDaoContract = randomAddress();
      const newDaoFundingManager = await MockDaoFundingManager.new();
      const newDaoRewardsManager = randomAddress();
      await contracts.dao.setNewDaoContracts(
        newDaoContract,
        newDaoFundingManager.address,
        newDaoRewardsManager,
        { from: addressOf.root },
      );
      await contracts.dao.migrateToNewDao(
        newDaoContract,
        newDaoFundingManager.address,
        newDaoRewardsManager,
        { from: addressOf.root },
      );

      // now this last moderator should be able to withdraw
      assert.ok(await contracts.daoStakeLocking.withdrawDGD.call(amount, { from: moderators[moderators.length - 1] }));
      await contracts.daoStakeLocking.withdrawDGD(amount, { from: moderators[moderators.length - 1] });
    });
  });

  describe('redeemBadge (additional scenario)', function () {
    let participants;
    beforeEach(async function () {
      await resetBeforeEach();
      participants = getParticipants(addressOf, bN);
    });
    afterEach(async () => {
      checkDgdStakeConsistency(contracts, bN);
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
    it('[redeem just after calculateGlobalRewardsBeforeNewQuarter, before calculating own rewards/reputation, but is first quarter of participation]: fail', async function () {
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

      // addressOf.dgdHolders[5] should not be able to redeem badge
      assert.ok(await a.failure(contracts.daoStakeLocking.redeemBadge({ from: addressOf.dgdHolders[5] })));
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
    it('[redeem badge in quarter 3, failure if user has skipped at least one quarter]', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(10 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      // in quarter 3 now

      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[5]), bN(0));
      await contracts.badgeToken.transfer(addressOf.dgdHolders[5], bN(1));
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(1), { from: addressOf.dgdHolders[5] });

      // participants[2] is not able redeem badge (coz they already participated in Q1)
      // and global rewards have not been calculated so far
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(participants[2].address), bN(1));
      assert.deepEqual(await contracts.daoStakeStorage.redeemedBadge.call(participants[2].address), false);
      assert.deepEqual((await contracts.badgeToken.balanceOf.call(participants[2].address)).toNumber() >= 1, true);
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(1), { from: participants[2].address });
      assert(await a.failure(contracts.daoStakeLocking.redeemBadge({ from: participants[2].address })));

      // now the global rewards will be updated
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(20 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      // now participants[2] calculates their own reputation/rewards
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: participants[2].address });

      // now they can redeem their badge
      assert.ok(await contracts.daoStakeLocking.redeemBadge.call({ from: participants[2].address }));
    });
    it('[user who has already withdrawn their DGD stake is now trying to redeem badge after a quarter\'s break]', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(10 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      // participants[2] withdraws from the DAO
      await contracts.daoStakeLocking.withdrawDGD(participants[2].dgdToLock, { from: participants[2].address });

      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(15 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      // participants[2] tries to redeem badge now
      await contracts.badgeToken.transfer(participants[2].address, bN(1));
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(1), { from: participants[2].address });

      // coz they have not updated their reputation till the previous quarter
      assert(await a.failure(contracts.daoStakeLocking.redeemBadge.call({ from: participants[2].address })));

      await contracts.daoStakeLocking.lockDGD(participants[2].dgdToLock, { from: participants[2].address });
      await contracts.daoStakeLocking.redeemBadge({ from: participants[2].address });
    });
  });
});
