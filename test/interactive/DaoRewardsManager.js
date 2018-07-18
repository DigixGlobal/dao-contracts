const a = require('awaiting');

const {
  deployFreshDao,
  phaseCorrection,
  BADGE_HOLDER_COUNT,
  DGD_HOLDER_COUNT,
} = require('../setup');

const {
  daoConstantsValues,
  phases,
} = require('../daoHelpers');

const {
  calculateUserEffectiveBalance,
  calculateDgxRewards,
  calculateReputation,
  calculateDgxDemurrage,
} = require('../daoCalculationHelper');

const {
  indexRange,
  getCurrentTimestamp,
  randomBigNumbers,
  randomBytes32,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoRewardsManager', function (accounts) {
  const libs = {};
  const contracts = {};
  const addressOf = {};

  const resetBeforeEach = async function () {
    await deployFreshDao(libs, contracts, addressOf, accounts, bN, web3);
    await contracts.daoIdentity.addGroupUser(bN(3), addressOf.prl, randomBytes32());
    await contracts.daoIdentity.addGroupUser(bN(4), addressOf.kycadmin, randomBytes32());
    const mockStakes = randomBigNumbers(bN, DGD_HOLDER_COUNT, 50 * (10 ** 9));
    const mockModeratorStakes = randomBigNumbers(bN, BADGE_HOLDER_COUNT, 3000 * (10 ** 9));
    await contracts.daoStakeStorage.mock_add_participants(addressOf.allParticipants.slice(BADGE_HOLDER_COUNT, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), mockStakes);
    await contracts.daoStakeStorage.mock_add_moderators(addressOf.allParticipants.slice(0, BADGE_HOLDER_COUNT), mockModeratorStakes);
    let allStakesSum = 0;
    for (const i in mockStakes) {
      allStakesSum += i;
    }
    await contracts.dgdToken.transfer(contracts.daoStakeLocking.address, allStakesSum);
    const quarterIndex = bN(1);
    await a.map(indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), 20, async (i) => {
      await contracts.daoRewardsStorage.mock_set_last_participated_quarter(addressOf.allParticipants[i], quarterIndex);
    });
    const mockQPs = randomBigNumbers(bN, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT, 10);
    const mockModeratorQPs = randomBigNumbers(bN, BADGE_HOLDER_COUNT, 6);
    const mockRPs = randomBigNumbers(bN, DGD_HOLDER_COUNT, 200);
    const mockModeratorRPs = randomBigNumbers(bN, BADGE_HOLDER_COUNT, 2000);
    for (const i of indexRange(0, BADGE_HOLDER_COUNT)) {
      mockModeratorRPs[i] += 100;
    }
    for (const i of indexRange(0, DGD_HOLDER_COUNT)) {
      mockRPs[i] += 50;
    }
    await contracts.daoPointsStorage.mock_set_qp(addressOf.allParticipants, mockQPs, quarterIndex);
    await contracts.daoPointsStorage.mock_set_moderator_qp(addressOf.badgeHolders, mockModeratorQPs, quarterIndex);
    await contracts.daoPointsStorage.mock_set_rp(addressOf.dgdHolders, mockRPs);
    await contracts.daoPointsStorage.mock_set_rp(addressOf.badgeHolders, mockModeratorRPs);
  };

  // const printPoints = function (pointsBefore, pointsAfter, calculatedReputation) {
  //   console.log('------ reputation points (before) ------');
  //   for (const i of indexRange(0, 5)) {
  //     console.log('dgdHolders[', i, '] : ', pointsBefore[i]);
  //   }
  //   console.log('------ reputation points (after) ------');
  //   for (const i of indexRange(0, 5)) {
  //     console.log('dgdHolders[', i, '] : ', pointsAfter[i]);
  //   }
  //   console.log('------ reputation points (calculated) ------');
  //   for (const i of indexRange(0, 5)) {
  //     console.log('dgdHolders[', i, '] : ', calculatedReputation[i]);
  //   }
  //   console.log('');
  // };
  // const printRewards = function (rewardsBefore, rewardsAfter, calculatedRewards) {
  //   console.log('------ dgx rewards (before) ------');
  //   for (const i of indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT)) {
  //     console.log('allParticipants[', i, '] : ', rewardsBefore[i]);
  //   }
  //   console.log('------ dgx rewards (after) ------');
  //   for (const i of indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT)) {
  //     console.log('allParticipants[', i, '] : ', rewardsAfter[i]);
  //   }
  //   console.log('------ dgx rewards (calculated) ------');
  //   for (const i of indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT)) {
  //     console.log('allParticipants[', i, '] : ', calculatedRewards[i]);
  //   }
  //   console.log('');
  // };

  const readReputationPoints = async function () {
    const points = [];
    for (const i of indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT)) {
      points.push(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[i]));
    }
    return points;
  };

  const readClaimableDgx = async function () {
    const rewards = [];
    for (const i of indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT)) {
      rewards.push(await contracts.daoRewardsStorage.claimableDGXs.call(addressOf.allParticipants[i]));
    }
    return rewards;
  };

  const calculateTransferFees = function (_amount, _base, _rate) {
    return Math.floor((_amount * _rate) / _base);
  };

  describe('updateRewardsBeforeNewQuarter', function () {
    before(async function () {
      await resetBeforeEach();
    });
    it('[Q1]: nothing happens when called in locking phase, main phase', async function () {
      // PART 1
      const pointsBefore = await readReputationPoints();
      const rewardsBefore = await readClaimableDgx();
      await a.map(indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), 20, async (i) => {
        await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.allParticipants[i] });
      });
      const pointsAfter = await readReputationPoints();
      const rewardsAfter = await readClaimableDgx();
      for (const i of indexRange(0, 5)) {
        assert.deepEqual(pointsBefore[i], pointsAfter[i]);
        assert.deepEqual(rewardsBefore[i], rewardsAfter[i]);
      }
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      // PART 2
      await a.map(indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), 20, async (i) => {
        await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.allParticipants[i] });
      });
      const pointsEvenAfter = await readReputationPoints();
      const rewardsEvenAfter = await readClaimableDgx();
      for (const i of indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT)) {
        assert.deepEqual(pointsBefore[i], pointsEvenAfter[i]);
        assert.deepEqual(rewardsBefore[i], rewardsEvenAfter[i]);
      }
    });
    it('[Q2]', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(20 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      // PART 1
      const currentQuarter = bN(2);
      const lastParticipatedQuarter = bN(1);
      const pointsBefore = await readReputationPoints();
      const rewardsBefore = await readClaimableDgx();

      const effectiveDGDBalances = [];
      const effectiveModeratorDGDBalances = [];
      const calculatedRewards = [];
      const calculatedReputation = [];

      for (const i of indexRange(0, BADGE_HOLDER_COUNT)) {
        effectiveDGDBalances.push(calculateUserEffectiveBalance(
          daoConstantsValues(bN).CONFIG_MINIMAL_PARTICIPATION_POINT,
          daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
          await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.badgeHolders[i], lastParticipatedQuarter),
          await contracts.daoPointsStorage.getReputation.call(addressOf.badgeHolders[i]),
          await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.badgeHolders[i]),
        ));
        effectiveModeratorDGDBalances.push(calculateUserEffectiveBalance(
          daoConstantsValues(bN).CONFIG_MINIMAL_MODERATOR_QUARTER_POINT,
          daoConstantsValues(bN).CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR,
          await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[i], lastParticipatedQuarter),
          await contracts.daoPointsStorage.getReputation.call(addressOf.badgeHolders[i]),
          await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.badgeHolders[i]),
        ));
      }

      for (const i of indexRange(0, DGD_HOLDER_COUNT)) {
        effectiveDGDBalances.push(calculateUserEffectiveBalance(
          daoConstantsValues(bN).CONFIG_MINIMAL_PARTICIPATION_POINT,
          daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
          await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[i], lastParticipatedQuarter),
          await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[i]),
          await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.dgdHolders[i]),
        ));
        effectiveModeratorDGDBalances.push(0); // since not moderators
      }

      for (const i of indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT)) {
        calculatedRewards.push(bN(calculateDgxRewards(
          effectiveDGDBalances[i],
          effectiveModeratorDGDBalances[i],
          daoConstantsValues(bN).CONFIG_PORTION_TO_BADGE_HOLDERS_NUM,
          daoConstantsValues(bN).CONFIG_PORTION_TO_BADGE_HOLDERS_DEN,
          await contracts.daoRewardsStorage.readRewardsPoolOfLastQuarter(lastParticipatedQuarter.plus(bN(1))),
          await contracts.daoRewardsStorage.readTotalEffectiveDGDLastQuarter(lastParticipatedQuarter.plus(bN(1))),
          await contracts.daoRewardsStorage.readTotalEffectiveModeratorDGDLastQuarter(lastParticipatedQuarter.plus(bN(1))),
        )).plus(rewardsBefore[i]));
        calculatedReputation.push(bN(calculateReputation(
          currentQuarter,
          await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.allParticipants[i]),
          await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.allParticipants[i]),
          await contracts.daoRewardsStorage.lastQuarterThatReputationWasUpdated.call(addressOf.allParticipants[i]),
          daoConstantsValues(bN).CONFIG_MAXIMUM_REPUTATION_DEDUCTION,
          daoConstantsValues(bN).CONFIG_PUNISHMENT_FOR_NOT_LOCKING,
          daoConstantsValues(bN).CONFIG_MINIMAL_PARTICIPATION_POINT,
          daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_NUM,
          daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_DEN,
          daoConstantsValues(bN).CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION,
          daoConstantsValues(bN).CONFIG_MINIMAL_MODERATOR_QUARTER_POINT,
          daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM,
          daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN,
          pointsBefore[i],
          await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.allParticipants[i], lastParticipatedQuarter),
          await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.allParticipants[i], lastParticipatedQuarter),
          (i < BADGE_HOLDER_COUNT),
        )));
      }

      await a.map(indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), 20, async (i) => {
        if (addressOf.dgdHolders[4] !== addressOf.allParticipants[i]) {
          await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.allParticipants[i] });
        }
      });

      const pointsAfter = await readReputationPoints();
      const rewardsAfter = await readClaimableDgx();

      await a.map(indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), 20, async (i) => {
        if (addressOf.allParticipants[i] !== addressOf.dgdHolders[4]) {
          console.log('read = ', rewardsAfter[i], ' & ', pointsAfter[i]);
          console.log('calc = ', calculatedRewards[i], ' & ', calculatedReputation[i]);
          console.log('');
          // assert.deepEqual(pointsAfter[i], bN(calculatedReputation[i]));
          // assert.deepEqual(rewardsAfter[i], bN(calculatedRewards[i]));
        }
      });
    });
    it('[Q3 and Q4]', async function () {
      await contracts.daoPointsStorage.mock_set_rp([addressOf.dgdHolders[4]], [100]);
      const pointsBefore = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[4]);
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE); // now q3
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(10 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolders[4] });

      const pointsFirst = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[4]);

      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE); // now q4
      await contracts.daoPointsStorage.mock_set_qp([addressOf.dgdHolders[4]], [bN(7)], bN(3));
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(15 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolders[4] });

      const pointsAfter = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[4]);

      const calculatedValue = calculateReputation(
        bN(3),
        bN(1),
        bN(0),
        bN(0),
        daoConstantsValues(bN).CONFIG_MAXIMUM_REPUTATION_DEDUCTION,
        daoConstantsValues(bN).CONFIG_PUNISHMENT_FOR_NOT_LOCKING,
        daoConstantsValues(bN).CONFIG_MINIMAL_PARTICIPATION_POINT,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_NUM,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_DEN,
        daoConstantsValues(bN).CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION,
        daoConstantsValues(bN).CONFIG_MINIMAL_MODERATOR_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN,
        pointsBefore,
        await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[4], bN(1)),
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.dgdHolders[4], bN(1)),
        false,
      );

      // for missing q2
      assert.deepEqual(
        pointsFirst,
        bN(calculatedValue),
      );

      const calculatedValue2 = calculateReputation(
        bN(4),
        bN(3),
        bN(1),
        bN(1),
        daoConstantsValues(bN).CONFIG_MAXIMUM_REPUTATION_DEDUCTION,
        daoConstantsValues(bN).CONFIG_PUNISHMENT_FOR_NOT_LOCKING,
        daoConstantsValues(bN).CONFIG_MINIMAL_PARTICIPATION_POINT,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_NUM,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_DEN,
        daoConstantsValues(bN).CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION,
        daoConstantsValues(bN).CONFIG_MINIMAL_MODERATOR_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN,
        pointsFirst,
        await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[4], bN(3)),
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.dgdHolders[4], bN(3)),
        false,
      );

      // for participating in q3
      assert.deepEqual(
        pointsAfter.toNumber(),
        calculatedValue2,
      );
    });
    it('[Q5 | demurrage testing]: the claimable dgx should be demurraged', async function () {
      // set last participated quarter to be q4
      await a.map(indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), 20, async (i) => {
        await contracts.daoRewardsStorage.mock_set_last_participated_quarter(addressOf.allParticipants[i], bN(4));
        await contracts.daoRewardsStorage.mock_set_last_quarter_that_rewards_was_updated(addressOf.allParticipants[i], bN(3));
      });

      // give some dummy quarter points for q4
      const quarterIndex = bN(4);
      const mockQPs = randomBigNumbers(bN, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT, 10);
      const mockModeratorQPs = randomBigNumbers(bN, BADGE_HOLDER_COUNT, 6);
      await contracts.daoPointsStorage.mock_set_qp(addressOf.allParticipants, mockQPs, quarterIndex);
      await contracts.daoPointsStorage.mock_set_moderator_qp(addressOf.badgeHolders, mockModeratorQPs, quarterIndex);

      const rewardsBefore = await readClaimableDgx();
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);

      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(25 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      const calculatedRewards = [];
      const effectiveDGDBalance = [];
      const effectiveModeratorDGDBalance = [];
      for (const i of indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT)) {
        effectiveDGDBalance[i] = bN(calculateUserEffectiveBalance(
          daoConstantsValues(bN).CONFIG_MINIMAL_PARTICIPATION_POINT,
          daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
          await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.allParticipants[i], bN(4)),
          await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[i]),
          await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.allParticipants[i]),
        ));
        effectiveModeratorDGDBalance[i] = (i >= BADGE_HOLDER_COUNT) ? 0 : calculateUserEffectiveBalance(
          daoConstantsValues(bN).CONFIG_MINIMAL_MODERATOR_QUARTER_POINT,
          daoConstantsValues(bN).CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR,
          await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.allParticipants[i], bN(4)),
          await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[i]),
          await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.allParticipants[i]),
        );
      }

      const threeDaysAgoInSeconds = bN(getCurrentTimestamp()).minus(bN(3 * 24 * 60 * 60));
      const tenDaysAgoInSeconds = bN(getCurrentTimestamp()).minus(bN(10 * 24 * 60 * 60));
      await contracts.daoRewardsStorage.mock_set_dgx_distribution_day(bN(5), threeDaysAgoInSeconds);
      await contracts.daoRewardsStorage.mock_set_dgx_distribution_day(bN(4), tenDaysAgoInSeconds);

      const demurrageConfig = await contracts.dgxToken.showDemurrageConfigs.call();
      for (const i of indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT)) {
        calculatedRewards[i] = rewardsBefore[i].minus(bN(calculateDgxDemurrage(
          rewardsBefore[i],
          await contracts.daoRewardsStorage.readDgxDistributionDay.call(bN(5)),
          await contracts.daoRewardsStorage.readDgxDistributionDay.call(bN(4)),
          demurrageConfig[0],
          demurrageConfig[1],
        ))).plus(bN(calculateDgxRewards(
          effectiveDGDBalance[i],
          effectiveModeratorDGDBalance[i],
          daoConstantsValues(bN).CONFIG_PORTION_TO_BADGE_HOLDERS_NUM,
          daoConstantsValues(bN).CONFIG_PORTION_TO_BADGE_HOLDERS_DEN,
          await contracts.daoRewardsStorage.readRewardsPoolOfLastQuarter.call(bN(5)),
          await contracts.daoRewardsStorage.readTotalEffectiveDGDLastQuarter.call(bN(5)),
          await contracts.daoRewardsStorage.readTotalEffectiveModeratorDGDLastQuarter.call(bN(5)),
        )));
      }

      await a.map(indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), 20, async (i) => {
        await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.allParticipants[i] });
      });

      const rewardsAfter = await readClaimableDgx();
      for (const i of indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT)) {
        console.log('read = ', rewardsAfter[i]);
        console.log('calc = ', calculatedRewards[i]);
        console.log('');
        // assert.deepEqual(rewardsAfter[i], calculatedRewards[i]);
      }
    });
  });

  describe('claimRewards', function () {
    before(async function () {
      await contracts.daoRewardsManager.claimRewards({ from: addressOf.dgdHolders[3] });
    });
    it('[claimable dgx = 0]: revert', async function () {
      assert(await a.failure(contracts.daoRewardsManager.claimRewards.call({ from: addressOf.dgdHolders[3] })));
    });
    it('[claimable dgx > 0]: success', async function () {
      // the rewards were calculated 3 days ago (CHECK Q5 test case above)
      const initialUserBalance = await contracts.dgxToken.balanceOf.call(addressOf.dgdHolders[0]);
      const initialDgxWithContract = await contracts.dgxToken.balanceOf.call(contracts.daoRewardsManager.address);
      const userClaimableDgx = await contracts.daoRewardsStorage.claimableDGXs.call(addressOf.dgdHolders[0]);
      const totalDGXsClaimed = await contracts.daoRewardsStorage.totalDGXsClaimed.call();
      const demurrageConfigs = await contracts.dgxToken.showDemurrageConfigs.call();
      const lastQuarterThatRewardsWasUpdated = await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[0]);
      const demurrageFees = calculateDgxDemurrage(
        userClaimableDgx,
        bN(getCurrentTimestamp()),
        await contracts.daoRewardsStorage.readDgxDistributionDay.call(lastQuarterThatRewardsWasUpdated.plus(bN(1))),
        demurrageConfigs[0],
        demurrageConfigs[1],
      );
      await contracts.daoRewardsManager.claimRewards({ from: addressOf.dgdHolders[0] });
      const finalUserBalance = await contracts.dgxToken.balanceOf.call(addressOf.dgdHolders[0]);
      const finalDgxWithContract = await contracts.dgxToken.balanceOf.call(contracts.daoRewardsManager.address);
      const finalUserClaimableDgx = await contracts.daoRewardsStorage.claimableDGXs.call(addressOf.dgdHolders[0]);
      const finalTotalDgxsClaimed = await contracts.daoRewardsStorage.totalDGXsClaimed.call();
      assert.deepEqual(finalTotalDgxsClaimed, totalDGXsClaimed.plus(userClaimableDgx).minus(bN(demurrageFees)));
      assert.deepEqual(finalUserClaimableDgx, bN(0));
      assert.deepEqual(finalDgxWithContract, initialDgxWithContract.minus(userClaimableDgx).plus(bN(demurrageFees)));
      const transferConfig = await contracts.dgxStorage.read_transfer_config.call();
      const estimatedTransferFees = calculateTransferFees(userClaimableDgx.minus(bN(demurrageFees)).toNumber(), transferConfig[1].toNumber(), transferConfig[2].toNumber());
      assert.deepEqual(finalUserBalance, initialUserBalance.plus(userClaimableDgx).minus(bN(estimatedTransferFees)).minus(bN(demurrageFees)));
    });
  });

  // TODO:
  describe('calculateGlobalRewardsBeforeNewQuarter', function () {
    before(async function () {
      await deployFreshDao(libs, contracts, addressOf, accounts, bN, web3);
    });
  });
});
