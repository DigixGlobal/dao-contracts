const a = require('awaiting');

const {
  deployFreshDao,
  phaseCorrection,
} = require('../setup');

const {
  phases,
} = require('../daoHelpers');

const {
  indexRange,
  randomBigNumbers,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;
const ACCEPTABLE_ROUNDING_ERROR = 1e-9;
const DGD_HOLDER_COUNT = 120;
const BADGE_HOLDER_COUNT = 20;

contract('DaoRewardsManager', function (accounts) {
  const libs = {};
  const contracts = {};
  const addressOf = {};

  const moderators = accounts.slice(0, BADGE_HOLDER_COUNT);
  const normalParticipants = accounts.slice(BADGE_HOLDER_COUNT, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT);

  const setMockValues = async function () {
    const mockStakes = randomBigNumbers(bN, DGD_HOLDER_COUNT, 50 * (10 ** 9));
    const mockModeratorStakes = randomBigNumbers(bN, BADGE_HOLDER_COUNT, 3000 * (10 ** 9));
    await contracts.daoStakeStorage.mock_add_participants(normalParticipants, mockStakes);
    await contracts.daoStakeStorage.mock_add_moderators(moderators, mockModeratorStakes);

    const quarterIndex = bN(1);
    await a.map(indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), 20, async (i) => {
      await contracts.daoRewardsStorage.mock_set_last_participated_quarter(accounts[i], quarterIndex);
    });
    const mockQPs = randomBigNumbers(bN, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT, 20);
    const mockModeratorQPs = randomBigNumbers(bN, BADGE_HOLDER_COUNT, 30);
    const mockRPs = randomBigNumbers(bN, DGD_HOLDER_COUNT, 1000);
    const mockModeratorRPs = randomBigNumbers(bN, BADGE_HOLDER_COUNT, 2000);
    for (const i of indexRange(0, BADGE_HOLDER_COUNT)) {
      mockModeratorRPs[i] += 100;
    }
    for (const i of indexRange(0, DGD_HOLDER_COUNT)) {
      mockRPs[i] += 50;
    }
    await contracts.daoPointsStorage.mock_set_qp(accounts.slice(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), mockQPs, quarterIndex);
    await contracts.daoPointsStorage.mock_set_moderator_qp(moderators, mockModeratorQPs, quarterIndex);
    await contracts.daoPointsStorage.mock_set_rp(normalParticipants, mockRPs);
    await contracts.daoPointsStorage.mock_set_rp(moderators, mockModeratorRPs);
  };

  const resetBeforeEach = async function () {
    await deployFreshDao(libs, contracts, addressOf, accounts, bN, web3);
    await setMockValues();
  };

  describe('[140 participants] calculateGlobalRewardsBeforeNewQuarter versus individual calculateUserRewardsForLastParticipatingQuarter', function () {
    before(async function () {
      await resetBeforeEach();
    });
    it('[Q2] Sum of DGX rewards from calculateUserRewardsForLastParticipatingQuarter is equal to dgxRewardsPoolLastQuarter', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      console.log('\tNow in Locking phase of Q2');
      const dgxFeesFirstQuarter = bN(1234 * 1e9);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, dgxFeesFirstQuarter);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(500), { from: addressOf.founderBadgeHolder });

      const dgxRewardsPoolFirstQuarter = await contracts.daoRewardsStorage.readRewardsPoolOfLastQuarter.call(bN(2));
      console.log('\t\t dgxRewardsPoolFirstQuarter = ', dgxRewardsPoolFirstQuarter);
      let sumOfParticipantsRewards = bN(0);
      let sumOfModeratorsRewards = bN(0);
      await a.map(indexRange(0, BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT), 20, async (i) => {
        const calculatedRewards = await contracts.daoRewardsManager.calculateUserRewardsForLastParticipatingQuarter(accounts[i]);
        sumOfParticipantsRewards = sumOfParticipantsRewards.add(calculatedRewards[0]);
        sumOfModeratorsRewards = sumOfModeratorsRewards.add(calculatedRewards[1]);
      });
      console.log('\t\t\t sumOfParticipantsRewards = ', sumOfParticipantsRewards);
      console.log('\t\t\t sumOfModeratorsRewards = ', sumOfModeratorsRewards);
      console.log('\t\t sumOfModeratorsRewards + sumOfParticipantsRewards = ', sumOfModeratorsRewards.add(sumOfParticipantsRewards));
      const correctSumOfParticipantsRewards = dgxRewardsPoolFirstQuarter.mul(0.95);
      const correctSumOfModeratorsRewards = dgxRewardsPoolFirstQuarter.mul(0.05);
      const error1 = correctSumOfParticipantsRewards.sub(sumOfParticipantsRewards).abs().div(correctSumOfParticipantsRewards);
      const error2 = correctSumOfModeratorsRewards.sub(sumOfModeratorsRewards).abs().div(correctSumOfModeratorsRewards);
      const error3 = dgxRewardsPoolFirstQuarter.sub(sumOfModeratorsRewards.add(sumOfParticipantsRewards)).abs().div(dgxRewardsPoolFirstQuarter);
      console.log('\t Rounding error of sumOfParticipantsRewards = ', error1.toFixed());
      console.log('\t Rounding error of sumOfModeratorsRewards = ', error2.toFixed());
      console.log('\t Rounding error of sum of all rewards = ', error3.toFixed());

      assert.deepEqual(error1.lt(ACCEPTABLE_ROUNDING_ERROR), true);
      assert.deepEqual(error2.lt(ACCEPTABLE_ROUNDING_ERROR), true);
      assert.deepEqual(error3.lt(ACCEPTABLE_ROUNDING_ERROR), true);
    });
  });
});
