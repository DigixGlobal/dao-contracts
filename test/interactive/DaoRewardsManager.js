const a = require('awaiting');

const {
  deployFreshDao,
  phaseCorrection,
  updateKyc,
  getParticipants,
  printDaoDetails,
  printParticipantDetails,
  BADGE_HOLDER_COUNT,
  DGD_HOLDER_COUNT,
} = require('../setup');

const {
  daoConstantsValues,
  phases,
  configs,
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
  randomAddress,
  randomAddresses,
  paddedHex,
  timeIsRecent,
} = require('@digix/helpers/lib/helpers');

const MockDaoFundingManager = artifacts.require('MockDaoFundingManager.sol');

const bN = web3.toBigNumber;
const web3Utils = require('web3-utils');

contract('DaoRewardsManager', function (accounts) {
  const libs = {};
  const contracts = {};
  const addressOf = {};

  const setMockValues = async function () {
    const mockStakes = randomBigNumbers(bN, DGD_HOLDER_COUNT, 50 * (10 ** 9));
    const mockModeratorStakes = randomBigNumbers(bN, BADGE_HOLDER_COUNT, 3000 * (10 ** 9));
    await contracts.daoStakeStorage.mock_add_participants(addressOf.allParticipants.slice(BADGE_HOLDER_COUNT, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), mockStakes);
    await contracts.daoStakeStorage.mock_add_moderators(addressOf.allParticipants.slice(0, BADGE_HOLDER_COUNT), mockModeratorStakes);
    let allStakesSum = 0;
    for (const i in mockStakes) {
      allStakesSum += i;
    }
    await contracts.dgdToken.transfer(contracts.daoStakeLocking.address, allStakesSum);
    const _quarterNumber = bN(1);
    await a.map(indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), 20, async (i) => {
      await contracts.daoRewardsStorage.mock_set_last_participated_quarter(addressOf.allParticipants[i], _quarterNumber);
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
    await contracts.daoPointsStorage.mock_set_qp(addressOf.allParticipants, mockQPs, _quarterNumber);
    await contracts.daoPointsStorage.mock_set_moderator_qp(addressOf.badgeHolders, mockModeratorQPs, _quarterNumber);
    await contracts.daoPointsStorage.mock_set_rp(addressOf.dgdHolders, mockRPs);
    await contracts.daoPointsStorage.mock_set_rp(addressOf.badgeHolders, mockModeratorRPs);
  };

  const resetBeforeEach = async function () {
    await deployFreshDao(libs, contracts, addressOf, accounts, bN, web3, 15, 15);
    await contracts.daoIdentity.addGroupUser(bN(3), addressOf.prl, randomBytes32());
    await contracts.daoIdentity.addGroupUser(bN(4), addressOf.kycadmin, randomBytes32());
    await setMockValues();
  };

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

  describe('updateRewardsAndReputationBeforeNewQuarter', function () {
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

    const printDifferences = function (pointsBefore, pointsAfter, calculatedReputation, pointsName) {
      console.log('\t\t------ ', pointsName, '(before) ------');
      for (const i of indexRange(0, 5)) {
        console.log('\t\tdgdHolders[', i, '] : ', pointsBefore[i]);
      }
      console.log('\t\t------ ', pointsName, '(after) ------');
      for (const i of indexRange(0, 5)) {
        console.log('\t\tdgdHolders[', i, '] : ', pointsAfter[i]);
      }
      console.log('\t\t------ ', pointsName, '(calculated) ------');
      for (const i of indexRange(0, 5)) {
        console.log('\t\tdgdHolders[', i, '] : ', calculatedReputation[i]);
      }
      console.log('');
    };

    it('[Q2]', async function () {
      // await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
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
          daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
          daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
          await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.badgeHolders[i], lastParticipatedQuarter),
          await contracts.daoPointsStorage.getReputation.call(addressOf.badgeHolders[i]),
          await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.badgeHolders[i]),
        ));
        effectiveModeratorDGDBalances.push(calculateUserEffectiveBalance(
          daoConstantsValues(bN).CONFIG_MODERATOR_MINIMAL_QUARTER_POINT,
          daoConstantsValues(bN).CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR,
          await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[i], lastParticipatedQuarter),
          await contracts.daoPointsStorage.getReputation.call(addressOf.badgeHolders[i]),
          await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.badgeHolders[i]),
        ));
      }

      for (const i of indexRange(0, DGD_HOLDER_COUNT)) {
        effectiveDGDBalances.push(calculateUserEffectiveBalance(
          daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
          daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
          await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[i], lastParticipatedQuarter),
          await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[i]),
          await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.dgdHolders[i]),
        ));
        effectiveModeratorDGDBalances.push(0); // since not moderators
      }

      for (const i of indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT)) {
        calculatedRewards.push(bN(calculateDgxRewards(
          effectiveDGDBalances[i],
          effectiveModeratorDGDBalances[i],
          daoConstantsValues(bN).CONFIG_PORTION_TO_MODERATORS_NUM,
          daoConstantsValues(bN).CONFIG_PORTION_TO_MODERATORS_DEN,
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
          daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
          daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_NUM,
          daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_DEN,
          daoConstantsValues(bN).CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION,
          daoConstantsValues(bN).CONFIG_MODERATOR_MINIMAL_QUARTER_POINT,
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
      printDifferences(pointsBefore, pointsAfter, calculatedReputation, 'Reputation points');
      printDifferences(rewardsBefore, rewardsAfter, calculatedRewards, 'Rewards');

      await a.map(indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), 20, async (i) => {
        if (addressOf.allParticipants[i] !== addressOf.dgdHolders[4]) {
          assert.deepEqual(pointsAfter[i], bN(calculatedReputation[i]));
          assert.deepEqual(rewardsAfter[i], bN(calculatedRewards[i]));
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
      console.log('Current quarter = ', await contracts.dao.currentQuarterNumber.call());

      await printParticipantDetails(bN, contracts, addressOf.dgdHolders[4]);
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolders[4] });

      await printParticipantDetails(bN, contracts, addressOf.dgdHolders[4]);
      const pointsAfter = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[4]);
      console.log('\tpointAfter = ', pointsAfter);
      const calculatedValue = calculateReputation(
        bN(3),
        bN(1),
        bN(0),
        bN(0),
        daoConstantsValues(bN).CONFIG_MAXIMUM_REPUTATION_DEDUCTION,
        daoConstantsValues(bN).CONFIG_PUNISHMENT_FOR_NOT_LOCKING,
        daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_NUM,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_DEN,
        daoConstantsValues(bN).CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION,
        daoConstantsValues(bN).CONFIG_MODERATOR_MINIMAL_QUARTER_POINT,
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
        bN(2),
        bN(2),
        daoConstantsValues(bN).CONFIG_MAXIMUM_REPUTATION_DEDUCTION,
        daoConstantsValues(bN).CONFIG_PUNISHMENT_FOR_NOT_LOCKING,
        daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_NUM,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_DEN,
        daoConstantsValues(bN).CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION,
        daoConstantsValues(bN).CONFIG_MODERATOR_MINIMAL_QUARTER_POINT,
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
      const _quarterNumber = bN(4);
      const mockQPs = randomBigNumbers(bN, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT, 10);
      const mockModeratorQPs = randomBigNumbers(bN, BADGE_HOLDER_COUNT, 6);
      await contracts.daoPointsStorage.mock_set_qp(addressOf.allParticipants, mockQPs, _quarterNumber);
      await contracts.daoPointsStorage.mock_set_moderator_qp(addressOf.badgeHolders, mockModeratorQPs, _quarterNumber);

      const rewardsBefore = await readClaimableDgx();
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);

      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(25 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      console.log('Calculated global rewards for current quarter = ', await contracts.dao.currentQuarterNumber.call());

      const calculatedRewards = [];
      const effectiveDGDBalance = [];
      const effectiveModeratorDGDBalance = [];
      for (const i of indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT)) {
        effectiveDGDBalance[i] = bN(calculateUserEffectiveBalance(
          daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
          daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
          await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.allParticipants[i], bN(4)),
          await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[i]),
          await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.allParticipants[i]),
        ));
        effectiveModeratorDGDBalance[i] = (i >= BADGE_HOLDER_COUNT) ? 0 : calculateUserEffectiveBalance(
          daoConstantsValues(bN).CONFIG_MODERATOR_MINIMAL_QUARTER_POINT,
          daoConstantsValues(bN).CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR,
          await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.allParticipants[i], bN(4)),
          await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[i]),
          await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.allParticipants[i]),
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
          daoConstantsValues(bN).CONFIG_PORTION_TO_MODERATORS_NUM,
          daoConstantsValues(bN).CONFIG_PORTION_TO_MODERATORS_DEN,
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
        // console.log('read = ', rewardsAfter[i]);
        // console.log('calc = ', calculatedRewards[i]);
        // console.log('');
        assert.deepEqual(rewardsAfter[i], calculatedRewards[i]);
      }
    });
  });

  describe('claimRewards', function () {
    before(async function () {
      const claimable = await contracts.daoRewardsStorage.claimableDGXs.call(addressOf.dgdHolders[3]);
      if (claimable.toNumber() > 0) await contracts.daoRewardsManager.claimRewards({ from: addressOf.dgdHolders[3] });
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
      assert.deepEqual(finalTotalDgxsClaimed, totalDGXsClaimed.plus(userClaimableDgx));
      assert.deepEqual(finalUserClaimableDgx, bN(0));
      assert.deepEqual(finalDgxWithContract, initialDgxWithContract.minus(userClaimableDgx).plus(bN(demurrageFees)));
      const transferConfig = await contracts.dgxStorage.read_transfer_config.call();
      const estimatedTransferFees = calculateTransferFees(userClaimableDgx.minus(bN(demurrageFees)).toNumber(), transferConfig[1].toNumber(), transferConfig[2].toNumber());
      assert.deepEqual(finalUserBalance, initialUserBalance.plus(userClaimableDgx).minus(bN(estimatedTransferFees)).minus(bN(demurrageFees)));
    });
    it('[claim dgx after the dao has been migrated]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      console.log('Current quarter = ', await contracts.dao.currentQuarterNumber.call());

      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(20 * (10 ** 9)));
      const newDaoContract = randomAddress();
      const newDaoFundingManager = await MockDaoFundingManager.new();
      const newDaoRewardsManager = randomAddress();

      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await contracts.dao.setNewDaoContracts(
        newDaoContract,
        newDaoFundingManager.address,
        newDaoRewardsManager,
        { from: addressOf.root },
      );
      console.log('is locking phase ? ', await contracts.daoRewardsManager.isLockingPhase.call());
      await contracts.dao.migrateToNewDao(
        newDaoContract,
        newDaoFundingManager.address,
        newDaoRewardsManager,
        { from: addressOf.root },
      );
      assert(await a.failure(contracts.daoRewardsManager.claimRewards.call({ from: addressOf.dgdHolders[1] })));
    });
  });

  describe('calculateGlobalRewardsBeforeNewQuarter', function () {
    let mockQPs;
    let mockRPs;
    let mockModeratorQPs;
    let mockModerators;
    let mockParticipants;
    let mockModeratorStakes;
    let mockParticipantStakes;
    beforeEach(async function () {
      await deployFreshDao(libs, contracts, addressOf, accounts, bN, web3, 20, 15);
      await contracts.daoIdentity.addGroupUser(bN(3), addressOf.prl, randomBytes32());
      await contracts.daoIdentity.addGroupUser(bN(4), addressOf.kycadmin, randomBytes32());
      await updateKyc(contracts, addressOf, getParticipants(addressOf, bN));
      const N_MODERATORS = 10;
      const N_PARTICIPANTS = 35;
      mockModerators = randomAddresses(N_MODERATORS);
      mockParticipants = mockModerators.concat(randomAddresses(N_PARTICIPANTS));
      mockModeratorStakes = randomBigNumbers(bN, N_MODERATORS, (20 * (10 ** 9)));
      mockParticipantStakes = mockModeratorStakes.concat(randomBigNumbers(bN, N_PARTICIPANTS, (20 * (10 ** 9))));
      mockModeratorQPs = randomBigNumbers(bN, N_MODERATORS, 8);
      mockQPs = randomBigNumbers(bN, N_MODERATORS + N_PARTICIPANTS, 10);
      mockRPs = randomBigNumbers(bN, N_MODERATORS + N_PARTICIPANTS, 100);
      for (const i of indexRange(0, N_MODERATORS)) {
        mockRPs[i] = mockRPs[i].plus(bN(100));
      }
      for (let i of mockModeratorStakes) {
        i = i.plus(bN(100 * (10 ** 9)));
      }
      for (let i of mockParticipantStakes) {
        i = i.plus(bN(10 * (10 ** 9)));
      }
      await contracts.daoStakeStorage.mock_add_moderators(mockModerators, mockModeratorStakes);
      await contracts.daoStakeStorage.mock_add_participants(mockParticipants, mockParticipantStakes);
      await contracts.daoPointsStorage.mock_set_qp(mockParticipants, mockQPs, bN(1));
      await contracts.daoPointsStorage.mock_set_moderator_qp(mockModerators, mockModeratorQPs, bN(1));
      await contracts.daoPointsStorage.mock_set_rp(mockParticipants, mockRPs);
      await contracts.daoRewardsStorage.mock_bulk_set_last_participated_quarter(mockParticipants, bN(1));

      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
    });
    it('[called in main phase]: revert', async function () {
      assert(await a.failure(contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(10), { from: addressOf.founderBadgeHolder })));
    });
    it('[not called by founder]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      assert(await a.failure(contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(10), { from: addressOf.root })));
      assert(await a.failure(contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(10), { from: addressOf.kycadmin })));
      assert(await a.failure(contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(10), { from: addressOf.prl })));
      assert(await a.failure(contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(10), { from: addressOf.badgeHolders[0] })));
      assert(await a.failure(contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(10), { from: addressOf.dgdHolders[0] })));
    });
    it('[after dao is migrated]: revert', async function () {
      const newDaoContract = randomAddress();
      const newDaoFundingManager = await MockDaoFundingManager.new();
      const newDaoRewardsManager = randomAddress();
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(10 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
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
      assert(await a.failure(contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(10), { from: addressOf.founderBadgeHolder })));
    });
    it('[check step by step process]: verify quarter info', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(20 * (10 ** 9)));
      await printDaoDetails(bN, contracts);

      const N_PARTICIPANTS = await contracts.daoStakeStorage.readTotalParticipant.call();
      const N_MODERATORS = await contracts.daoStakeStorage.readTotalModerators.call();
      const N_CYCLES = Math.floor((N_PARTICIPANTS.toNumber() + N_MODERATORS.toNumber()) / 10);
      console.log(`\t\tN_PARTICIPANTS = ${N_PARTICIPANTS}, N_MODERATORS=${N_MODERATORS}, N_CYCLES=${N_CYCLES}`);
      for (const i of indexRange(0, N_CYCLES + 1)) {
        if (i === 5) await printDaoDetails(bN, contracts);

        console.log('\t\tstep id (i) = ', i);
        if (i < N_CYCLES) {
          assert.deepEqual(await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter.call(
            bN(10),
            { from: addressOf.founderBadgeHolder },
          ), false);
        } else {
          assert.deepEqual(await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter.call(
            bN(10),
            { from: addressOf.founderBadgeHolder },
          ), true);
        }
        const tx = await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(10), { from: addressOf.founderBadgeHolder });

        if (i < N_CYCLES) {
          assert.equal(tx.logs.length, 0);
        } else {
          assert.deepEqual(tx.logs[0].event, 'StartNewQuarter');
          assert.deepEqual(tx.logs[0].args._quarterNumber, bN(2));
        }

        // test the intermediate result
        let intermediateResult;
        let key;
        let lastAddress;
        if (i < Math.floor(N_PARTICIPANTS.toNumber() / 10)) {
          key = web3Utils.soliditySha3(
            { t: 'bytes32', v: paddedHex(web3, configs(bN).INTERMEDIATE_DGD_IDENTIFIER) },
            { t: 'uint256', v: bN(1) },
          );
          lastAddress = mockParticipants[((i + 1) * 10) - 1];
          intermediateResult = await contracts.intermediateResultsStorage.getIntermediateResults.call(key);
          assert.deepEqual(intermediateResult[0], lastAddress);
        } else {
          key = web3Utils.soliditySha3(
            { t: 'bytes32', v: paddedHex(web3, configs(bN).INTERMEDIATE_MODERATOR_DGD_IDENTIFIER) },
            { t: 'uint256', v: bN(1) },
          );
          const index = ((i + 1) * 10) - (N_PARTICIPANTS.toNumber() + 1);
          lastAddress = index < N_MODERATORS.toNumber() ? mockModerators[index] : mockModerators[mockModerators.length - 1];
          intermediateResult = await contracts.intermediateResultsStorage.getIntermediateResults.call(key);
          assert.deepEqual(intermediateResult[0], lastAddress);
        }
      }

      const effectiveBalances = [];
      const effectiveModeratorBalances = [];
      let totalEffectiveDGDPreviousQuarter = bN(0);
      let totalEffectiveModeratorDGDLastQuarter = bN(0);
      for (const i of indexRange(0, N_MODERATORS.toNumber())) {
        effectiveModeratorBalances.push(calculateUserEffectiveBalance(
          daoConstantsValues(bN).CONFIG_MODERATOR_MINIMAL_QUARTER_POINT,
          daoConstantsValues(bN).CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR,
          mockModeratorQPs[i],
          mockRPs[i],
          mockModeratorStakes[i],
        ));
        totalEffectiveModeratorDGDLastQuarter = totalEffectiveModeratorDGDLastQuarter.plus(effectiveModeratorBalances[i]);
      }
      for (const i of indexRange(0, N_PARTICIPANTS.toNumber())) {
        effectiveBalances.push(calculateUserEffectiveBalance(
          daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
          daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
          mockQPs[i],
          mockRPs[i],
          mockParticipantStakes[i],
        ));
        totalEffectiveDGDPreviousQuarter = totalEffectiveDGDPreviousQuarter.plus(effectiveBalances[i]);
      }

      const quarterInfo2 = await contracts.daoRewardsStorage.readQuarterInfo.call(bN(2));
      assert.deepEqual(totalEffectiveDGDPreviousQuarter, quarterInfo2[3]);
      assert.deepEqual(totalEffectiveModeratorDGDLastQuarter, quarterInfo2[7]);
    });
    it('[daoRewardsManager already has some dgx unclaimed from previous quarter]: verify quarter info', async function () {
      // this user will claim their dgx
      const user8 = accounts[8];
      await contracts.daoStakeStorage.mock_add_participants([user8], [bN(20 * (10 ** 9))]);
      await contracts.daoPointsStorage.mock_set_qp([user8], [bN(7)], bN(1));
      await contracts.daoPointsStorage.mock_set_rp([user8], [bN(75)]);
      await contracts.daoRewardsStorage.mock_set_last_participated_quarter(user8, bN(1));
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(10 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      // claim now
      assert.deepEqual(await contracts.dgxToken.balanceOf.call(user8), bN(0));
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: user8 });

      const threeDaysAgoInSeconds = bN(getCurrentTimestamp()).minus(bN(3 * 24 * 60 * 60));
      await contracts.daoRewardsStorage.mock_set_dgx_distribution_day(bN(2), threeDaysAgoInSeconds);
      const claimableDGX = await contracts.daoRewardsStorage.claimableDGXs.call(user8);
      await contracts.daoRewardsManager.claimRewards({ from: user8 });
      const demurrageConfig = await contracts.dgxToken.showDemurrageConfigs.call();
      const demurrageFee = calculateDgxDemurrage(
        claimableDGX,
        bN(getCurrentTimestamp()),
        await contracts.daoRewardsStorage.readDgxDistributionDay.call(bN(2)),
        demurrageConfig[0],
        demurrageConfig[1],
      );

      assert.isAbove((await contracts.dgxToken.balanceOf.call(user8)).toNumber(), 0);
      await contracts.daoRewardsStorage.mock_bulk_set_last_participated_quarter(mockParticipants, bN(2));
      await contracts.daoPointsStorage.mock_set_qp(mockParticipants, mockQPs, bN(2));
      await contracts.daoPointsStorage.mock_set_moderator_qp(mockModerators, mockModeratorQPs, bN(2));
      await contracts.daoPointsStorage.mock_set_rp(mockParticipants, mockRPs);
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(5 * (10 ** 9)));
      const tx1 = await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      const tx2 = await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      const tx3 = await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      // verify event logs
      assert.equal(tx1.logs.length, 0);
      assert.equal(tx2.logs.length, 0);
      assert.deepEqual(tx3.logs[0].event, 'StartNewQuarter');
      assert.deepEqual(tx3.logs[0].args._quarterNumber, bN(3));

      const quarterInfo = await contracts.daoRewardsStorage.readQuarterInfo.call(bN(3));
      assert.deepEqual(timeIsRecent(quarterInfo[8], 5), true);
      assert.deepEqual(quarterInfo[9], bN(5 * (10 ** 9)).plus(bN(demurrageFee)));
      assert.deepEqual(quarterInfo[10], bN(10 * (10 ** 9)).plus(bN(5 * (10 ** 9))).plus(bN(demurrageFee)));
    });
    it('[re-call the function after completion]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(20 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      assert.deepEqual(await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter.call(bN(20), { from: addressOf.founderBadgeHolder }), true);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      assert(await a.failure(contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter.call(bN(10), { from: addressOf.founderBadgeHolder })));
    });
  });
});
