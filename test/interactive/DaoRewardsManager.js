const a = require('awaiting');

const DaoRewardsManager = artifacts.require('./DaoRewardsManager.sol');
const MockDGD = artifacts.require('./MockDGD.sol');
const MockBadge = artifacts.require('./MockBadge.sol');
const MockDgxDemurrageReporter = artifacts.require('./MockDgxDemurrageReporter.sol');
const MockDgx = artifacts.require('./MockDgx.sol');
const MockDgxStorage = artifacts.require('./MockDgxStorage.sol');
const DaoIdentity = artifacts.require('./DaoIdentity.sol');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  deployServices,
} = require('../setup');

const {
  getTimeToNextPhase,
  daoConstantsKeys,
  daoConstantsValues,
  getPhase,
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
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoRewardsManager', function (accounts) {
  let libs;
  let contracts;
  let addressOf;

  const resetDeployment = async function (quarterIndex) {
    libs = {};
    contracts = {};
    addressOf = {};
    await deployLibraries(libs);
    await deployNewContractResolver(contracts);
    await getAccountsAndAddressOf(accounts, addressOf);
    contracts.dgdToken = await MockDGD.new();
    contracts.badgeToken = await MockBadge.new();
    contracts.dgxStorage = await MockDgxStorage.new();
    contracts.dgxToken = await MockDgx.new(contracts.dgxStorage.address, addressOf.feesadmin);
    await contracts.dgxStorage.setInteractive(contracts.dgxToken.address);
    contracts.dgxDemurrageReporter = await MockDgxDemurrageReporter.new(contracts.dgxToken.address);
    await deployStorage(libs, contracts, contracts.resolver, addressOf);
    await deployServices(libs, contracts, contracts.resolver, addressOf);
    contracts.daoRewardsManager = await DaoRewardsManager.new(contracts.resolver.address, contracts.dgxToken.address);
    await contracts.resolver.register_contract('dao:stake-locking', addressOf.root);
    await contracts.resolver.register_contract('dao:voting:claims', addressOf.root);
    await contracts.resolver.register_contract('dao:voting', addressOf.root);
    await contracts.resolver.register_contract('c:dao', addressOf.root);
    contracts.daoIdentity = await DaoIdentity.new(contracts.resolver.address);
    await contracts.daoIdentity.addGroupUser(bN(2), addressOf.founderBadgeHolder, '');
    await contracts.daoStorage.setStartOfFirstQuarter(getCurrentTimestamp());
    await setDummyConfig();
    // bootstrap with points
    await a.map(indexRange(0, 5), 20, async (i) => {
      await contracts.daoPointsStorage.addReputation(addressOf.dgdHolders[i], bN(50));
    });
    await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[0], bN(10), quarterIndex);
    await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[1], bN(10), quarterIndex);
    await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[2], bN(2), quarterIndex);
    await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[3], bN(0), quarterIndex);
    await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[4], bN(10), quarterIndex);
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
  //   for (const i of indexRange(0, 5)) {
  //     console.log('dgdHolders[', i, '] : ', rewardsBefore[i]);
  //   }
  //   console.log('------ dgx rewards (after) ------');
  //   for (const i of indexRange(0, 5)) {
  //     console.log('dgdHolders[', i, '] : ', rewardsAfter[i]);
  //   }
  //   console.log('------ dgx rewards (calculated) ------');
  //   for (const i of indexRange(0, 5)) {
  //     console.log('dgdHolders[', i, '] : ', calculatedRewards[i]);
  //   }
  //   console.log('');
  // };

  const setDummyConfig = async function () {
    // set locking phase to be 10 seconds
    // set quarter phase to be 20 seconds
    // set minimal participation point to be 5
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

  const readReputationPoints = async function () {
    const points = [];
    for (const i of indexRange(0, 5)) {
      points.push(await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[i]));
    }
    return points;
  };

  const readClaimableDgx = async function () {
    const rewards = [];
    for (const i of indexRange(0, 5)) {
      rewards.push(await contracts.daoRewardsStorage.claimableDGXs.call(addressOf.dgdHolders[i]));
    }
    return rewards;
  };

  const calculateTransferFees = function (_amount, _base, _rate) {
    return Math.floor((_amount * _rate) / _base);
  };

  // TODO:
  // situations where demurrage is charged
  describe('updateRewardsBeforeNewQuarter', function () {
    /**
     * dgdHolders[0] ------ QP, RP (10, 50) ------- DGD 5  [rep goes up, good rewards]
     * dgdHolders[1] ------ QP, RP (10, 50) ------- DGD 10 [rep goes up, double rewards than dgdHolders[0]]
     * dgdHolders[2] ------ QP, RP (2 , 50) ------- DGD 20 [rep must go down, some rewards]
     * dgdHolders[3] ------ QP, RP (0 , 50) ------- DGD 20 [rep must go down, no rewards]
     * dgdHolders[4] ------ QP, RP (10, 50) ------- DGD 10 [does not participate in Q2 or Q3, check in Q4]
     */
    before(async function () {
      await resetDeployment(bN(1));
      // lock some tokens
      const stake = [bN(5 * (10 ** 9)), bN(10 * (10 ** 9)), bN(20 * (10 ** 9)), bN(20 * (10 ** 9)), bN(10 * (10 ** 9))];
      for (const i of indexRange(0, 5)) {
        await contracts.daoStakeStorage.updateUserDGDStake(addressOf.dgdHolders[i], stake[i], stake[i]);
        await contracts.daoStakeStorage.addToParticipantList(addressOf.dgdHolders[i]);
      }
      await contracts.daoStakeStorage.updateTotalLockedDGDStake(bN(65 * (10 ** 9)));
      await a.map(indexRange(0, 5), 20, async (i) => {
        await contracts.daoRewardsStorage.mock_set_last_participated_quarter(addressOf.dgdHolders[i], bN(1));
      });
    });
    it('[Q1]: nothing happens when called in locking phase, main phase', async function () {
      // PART 1
      const pointsBefore = await readReputationPoints();
      const rewardsBefore = await readClaimableDgx();
      await a.map(indexRange(0, 5), 20, async (i) => {
        await contracts.daoRewardsManager.updateRewardsBeforeNewQuarter(addressOf.dgdHolders[i]);
      });
      const pointsAfter = await readReputationPoints();
      const rewardsAfter = await readClaimableDgx();
      for (const i of indexRange(0, 5)) {
        assert.deepEqual(pointsBefore[i], pointsAfter[i]);
        assert.deepEqual(rewardsBefore[i], rewardsAfter[i]);
      }
      await phaseCorrection(phases.MAIN_PHASE);
      // PART 2
      await a.map(indexRange(0, 5), 20, async (i) => {
        await contracts.daoRewardsManager.updateRewardsBeforeNewQuarter(addressOf.dgdHolders[i]);
      });
      const pointsEvenAfter = await readReputationPoints();
      const rewardsEvenAfter = await readClaimableDgx();
      for (const i of indexRange(0, 5)) {
        assert.deepEqual(pointsBefore[i], pointsEvenAfter[i]);
        assert.deepEqual(rewardsBefore[i], rewardsEvenAfter[i]);
      }
    });
    it('[Q2]', async function () {
      await phaseCorrection(phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(20 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter({ from: addressOf.founderBadgeHolder });

      // PART 1
      const currentQuarter = bN(2);
      const lastParticipatedQuarter = bN(1);
      const pointsBefore = await readReputationPoints();
      const rewardsBefore = await readClaimableDgx();

      const effectiveDGDBalances = [];
      const effectiveBadgeBalances = [];
      const calculatedRewards = [];
      const calculatedReputation = [];

      for (const i of indexRange(0, 5)) {
        effectiveDGDBalances.push(calculateUserEffectiveBalance(
          daoConstantsValues(bN).CONFIG_MINIMAL_PARTICIPATION_POINT,
          daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
          await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[i], lastParticipatedQuarter),
          await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[i]),
          await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.dgdHolders[i]),
        ));
        effectiveBadgeBalances.push(0); // since not considering badges yet
      }
      for (const i of indexRange(0, 5)) {
        calculatedRewards.push(calculateDgxRewards(
          effectiveDGDBalances[i],
          effectiveBadgeBalances[i],
          daoConstantsValues(bN).CONFIG_PORTION_TO_BADGE_HOLDERS_NUM,
          daoConstantsValues(bN).CONFIG_PORTION_TO_BADGE_HOLDERS_DEN,
          await contracts.daoRewardsStorage.readRewardsPoolOfLastQuarter(lastParticipatedQuarter.plus(bN(1))),
          await contracts.daoRewardsStorage.readTotalEffectiveDGDLastQuarter(lastParticipatedQuarter.plus(bN(1))),
          await contracts.daoRewardsStorage.readTotalEffectiveBadgeLastQuarter(lastParticipatedQuarter.plus(bN(1))),
        ) + rewardsBefore[i].toNumber());
        calculatedReputation.push(calculateReputation(
          currentQuarter,
          await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[i]),
          await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[i]),
          await contracts.daoRewardsStorage.lastQuarterThatReputationWasUpdated.call(addressOf.dgdHolders[i]),
          daoConstantsValues(bN).CONFIG_MAXIMUM_REPUTATION_DEDUCTION,
          daoConstantsValues(bN).CONFIG_PUNISHMENT_FOR_NOT_LOCKING,
          daoConstantsValues(bN).CONFIG_MINIMAL_PARTICIPATION_POINT,
          daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_NUM,
          daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_DEN,
          pointsBefore[i],
          await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[i], lastParticipatedQuarter),
        ));
      }

      await a.map(indexRange(0, 5), 20, async (i) => {
        await contracts.daoRewardsManager.updateRewardsBeforeNewQuarter(addressOf.dgdHolders[i]);
      });

      const pointsAfter = await readReputationPoints();
      const rewardsAfter = await readClaimableDgx();

      await a.map(indexRange(0, 5), 20, async (i) => {
        assert.deepEqual(pointsAfter[i], bN(calculatedReputation[i]));
        assert.deepEqual(rewardsAfter[i], bN(calculatedRewards[i]));
      });
    });
    it('[Q3 and Q4]', async function () {
      const pointsBefore = await readReputationPoints();
      await contracts.daoRewardsStorage.mock_set_last_participated_quarter(addressOf.dgdHolders[4], bN(1));
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[4], bN(5), bN(3));
      await phaseCorrection(phases.MAIN_PHASE);
      await phaseCorrection(phases.LOCKING_PHASE); // now q3
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(10 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter({ from: addressOf.founderBadgeHolder });

      await contracts.daoRewardsManager.updateRewardsBeforeNewQuarter(addressOf.dgdHolders[4]);
      const pointsFirst = await readReputationPoints();
      await phaseCorrection(phases.MAIN_PHASE);
      await phaseCorrection(phases.LOCKING_PHASE); // now q4
      await contracts.daoRewardsStorage.mock_set_last_participated_quarter(addressOf.dgdHolders[4], bN(3));
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(15 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter({ from: addressOf.founderBadgeHolder });

      const lastParticipatedQuarter = await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[4]);
      const lastQuarterThatRewardsWasUpdated = await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[4]);
      const lastQuarterThatReputationWasUpdated = await contracts.daoRewardsStorage.lastQuarterThatReputationWasUpdated.call(addressOf.dgdHolders[4]);

      await contracts.daoRewardsManager.updateRewardsBeforeNewQuarter(addressOf.dgdHolders[4]);

      const pointsAfter = await readReputationPoints();

      // for missing q2
      assert.deepEqual(
        pointsFirst[4],
        pointsBefore[4].minus(daoConstantsValues(bN).CONFIG_PUNISHMENT_FOR_NOT_LOCKING)
          .minus(daoConstantsValues(bN).CONFIG_MAXIMUM_REPUTATION_DEDUCTION),
      );

      // for the 5 QPs in q3
      assert.deepEqual(
        pointsAfter[4].toNumber(),
        calculateReputation(
          bN(4),
          lastParticipatedQuarter,
          lastQuarterThatRewardsWasUpdated,
          lastQuarterThatReputationWasUpdated,
          daoConstantsValues(bN).CONFIG_MAXIMUM_REPUTATION_DEDUCTION,
          daoConstantsValues(bN).CONFIG_PUNISHMENT_FOR_NOT_LOCKING,
          daoConstantsValues(bN).CONFIG_MINIMAL_PARTICIPATION_POINT,
          daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_NUM,
          daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_DEN,
          pointsFirst[4],
          bN(5),
        ),
      );
    });
    it('[Q5 | demurrage testing]: the claimable dgx should be demurraged', async function () {
      // give some dummy quarter points for q4
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[2], bN(1), bN(4));
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[3], bN(10), bN(4));
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[4], bN(5), bN(4));
      await contracts.daoRewardsStorage.mock_set_last_participated_quarter(addressOf.dgdHolders[2], bN(4));
      await contracts.daoRewardsStorage.mock_set_last_participated_quarter(addressOf.dgdHolders[3], bN(4));
      await contracts.daoRewardsStorage.mock_set_last_participated_quarter(addressOf.dgdHolders[4], bN(4));

      const rewardsBefore = await readClaimableDgx();
      // const pointsBefore = await readReputationPoints();
      await phaseCorrection(phases.MAIN_PHASE);
      await phaseCorrection(phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(25 * (10 ** 9)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter({ from: addressOf.founderBadgeHolder });
      const calculatedRewards = [];
      const pointsCalculated = [];
      const effectiveDGDBalance = [];
      for (const i of indexRange(2, 5)) {
        effectiveDGDBalance[i] = bN(calculateUserEffectiveBalance(
          daoConstantsValues(bN).CONFIG_MINIMAL_PARTICIPATION_POINT,
          daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
          daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
          await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[i], bN(4)),
          await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[i]),
          await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.dgdHolders[i]),
        ));
      }
      const threeDaysAgoInSeconds = bN(getCurrentTimestamp()).minus(bN(3 * 24 * 60 * 60));
      const tenDaysAgoInSeconds = bN(getCurrentTimestamp()).minus(bN(10 * 24 * 60 * 60));
      await contracts.daoRewardsStorage.mock_set_dgx_distribution_day(bN(4), threeDaysAgoInSeconds);
      await contracts.daoRewardsStorage.mock_set_dgx_distribution_day(bN(3), tenDaysAgoInSeconds);
      // demurrage should be charged for the 5 days gap between these distribution days
      const demurrageConfig = await contracts.dgxToken.showDemurrageConfigs.call();
      for (const i of indexRange(2, 5)) {
        calculatedRewards[i] = rewardsBefore[i].minus(bN(calculateDgxDemurrage(
          rewardsBefore[i],
          await contracts.daoRewardsStorage.readDgxDistributionDay.call(bN(5)),
          await contracts.daoRewardsStorage.readDgxDistributionDay.call(bN(4)),
          demurrageConfig[0],
          demurrageConfig[1],
        ))).plus(bN(calculateDgxRewards(
          effectiveDGDBalance[i],
          await contracts.daoStakeStorage.readUserEffectiveDGDStake.call(addressOf.dgdHolders[i]),
          daoConstantsValues(bN).CONFIG_PORTION_TO_BADGE_HOLDERS_NUM,
          daoConstantsValues(bN).CONFIG_PORTION_TO_BADGE_HOLDERS_DEN,
          await contracts.daoRewardsStorage.readRewardsPoolOfLastQuarter.call(bN(5)),
          await contracts.daoRewardsStorage.readTotalEffectiveDGDLastQuarter.call(bN(5)),
          bN(0),
        )));

        pointsCalculated[i] = calculateReputation(
          bN(5),
          await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[i]),
          await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[i]),
          await contracts.daoRewardsStorage.lastQuarterThatReputationWasUpdated.call(addressOf.dgdHolders[i]),
          daoConstantsValues(bN).CONFIG_MAXIMUM_REPUTATION_DEDUCTION,
          daoConstantsValues(bN).CONFIG_PUNISHMENT_FOR_NOT_LOCKING,
          daoConstantsValues(bN).CONFIG_MINIMAL_PARTICIPATION_POINT,
          daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_NUM,
          daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_DEN,
          await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[i]),
          await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[i], bN(4)),
        );
      }

      // set last participated quarter to be q4
      await a.map(indexRange(2, 5), 20, async (i) => {
        await contracts.daoRewardsStorage.mock_set_last_participated_quarter(addressOf.dgdHolders[i], bN(4));
        await contracts.daoRewardsStorage.mock_set_last_quarter_that_rewards_was_updated(addressOf.dgdHolders[i], bN(3));
      });
      await a.map(indexRange(2, 5), 20, async (i) => {
        await contracts.daoRewardsManager.updateRewardsBeforeNewQuarter(addressOf.dgdHolders[i]);
      });
      const rewardsAfter = await readClaimableDgx();
      const pointsAfter = await readReputationPoints();

      for (const i of indexRange(2, 5)) {
        assert.deepEqual(rewardsAfter[i], calculatedRewards[i]);
        assert.deepEqual(pointsAfter[i], bN(pointsCalculated[i]));
      }
    });
  });

  // TODO:
  // situtations where demurrage is charged
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
      const demurrageFees = calculateDgxDemurrage(
        userClaimableDgx,
        bN(getCurrentTimestamp()),
        await contracts.daoRewardsStorage.readDgxDistributionDay.call(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[0])),
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
      assert.deepEqual(finalDgxWithContract, initialDgxWithContract.minus(userClaimableDgx));
      const transferConfig = await contracts.dgxStorage.read_transfer_config.call();
      const estimatedTransferFees = calculateTransferFees(userClaimableDgx.toNumber(), transferConfig[1].toNumber(), transferConfig[2].toNumber());
      assert.deepEqual(finalUserBalance, initialUserBalance.plus(userClaimableDgx).minus(bN(estimatedTransferFees)).minus(demurrageFees));
    });
  });

  // TODO:
  describe('calculateGlobalRewardsBeforeNewQuarter', function () {
    before(async function () {
      await resetDeployment();
    });
  });
});
