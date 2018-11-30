const {
  deployFreshDao,
  readDummyConfig,
  initQuarter,
  initialTransferTokens,
  getStartOfFirstQuarterFor,
  setStartOfFirstQuarterTo,
} = require('./../setup');

const {
  phases,
} = require('./../daoHelpers');

const {
  getCurrentTimestamp,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoStakeLocking', function (accounts) {
  let dummyConfig;
  const libs = {};
  const contracts = {};
  const addressOf = {};

  before(async function () {
    await deployFreshDao(libs, contracts, addressOf, accounts, bN, web3);
    await initialTransferTokens(contracts, addressOf, bN);
    dummyConfig = await readDummyConfig(contracts);
  });

  describe('lockDGD', function () {
    it('[lockDGD in Q1 | DGD < CONFIG_MINIMUM_LOCKED_DGD]: success | not a participant', async function () {
      const amount = bN(1 * (10 ** 8));
      // approve tokens to be used by contract
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, amount, { from: addressOf.dgdHolders[0] });
      // addressOf.dgdHolders[0] locks DGDs
      assert.ok(await contracts.daoStakeLocking.lockDGD.call(amount, { from: addressOf.dgdHolders[0] }));
      await contracts.daoStakeLocking.lockDGD(amount, { from: addressOf.dgdHolders[0] });
      // verify states
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[0]), bN(0));
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[0]), false);
      assert.deepEqual(await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.dgdHolders[0]), amount);
      assert.deepEqual(await contracts.daoStakeStorage.actualLockedDGD.call(addressOf.dgdHolders[0]), amount);
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[0]), bN(0));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatReputationWasUpdated.call(addressOf.dgdHolders[0]), bN(0));
    });
    it('[lockDGD in Q1 | DGD = CONFIG_MINIMUM_LOCKED_DGD]: success | is a participant', async function () {
      const amount = bN(1 * (10 ** 9));
      // approve tokens to be used by contract
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, amount, { from: addressOf.dgdHolders[1] });
      // addressOf.dgdHolders[1] locks DGDs
      assert.ok(await contracts.daoStakeLocking.lockDGD.call(amount, { from: addressOf.dgdHolders[1] }));
      await contracts.daoStakeLocking.lockDGD(amount, { from: addressOf.dgdHolders[1] });
      // verify states
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[1]), bN(1));
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[1]), true);
      assert.deepEqual(await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.dgdHolders[1]), amount);
      assert.deepEqual(await contracts.daoStakeStorage.actualLockedDGD.call(addressOf.dgdHolders[1]), amount);
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[1]), bN(0));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatReputationWasUpdated.call(addressOf.dgdHolders[1]), bN(0));
    });
    it('[lockDGD in Q2 | DGD >= CONFIG_MINIMUM_LOCKED_DGD]: success | is a participant', async function () {
      // teleport to Q2 locking phase
      const _startOfFirstQuarter = getStartOfFirstQuarterFor(bN(2), phases.LOCKING_PHASE, dummyConfig[0], dummyConfig[1], bN(getCurrentTimestamp()), bN);
      await setStartOfFirstQuarterTo(contracts, addressOf, _startOfFirstQuarter);
      await initQuarter(contracts, bN(2), bN(getCurrentTimestamp()));

      const amount = bN(2 * (10 ** 9));
      // approve tokens to be used by contract
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, amount, { from: addressOf.dgdHolders[2] });
      // addressOf.dgdHolders[2] locks DGDs
      assert.ok(await contracts.daoStakeLocking.lockDGD.call(amount, { from: addressOf.dgdHolders[2] }));
      await contracts.daoStakeLocking.lockDGD(amount, { from: addressOf.dgdHolders[2] });
      // verify states
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[2]), bN(2));
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[2]), true);
      assert.deepEqual(await contracts.daoStakeStorage.lockedDGDStake.call(addressOf.dgdHolders[2]), amount);
      assert.deepEqual(await contracts.daoStakeStorage.actualLockedDGD.call(addressOf.dgdHolders[2]), amount);
      // assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[2]), bN(1));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatReputationWasUpdated.call(addressOf.dgdHolders[2]), bN(1));
    });
    it('[lockDGD in Q2 | withdraw in Q2 | lock in Q3]', async function () {
      // this user has participated in carbon voting 1
      await contracts.carbonVoting1.mock_set_voted(addressOf.dgdHolders[3]);
      const amount = bN(1 * (10 ** 9));
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, amount.times(bN(2)), { from: addressOf.dgdHolders[3] });
      // even after locking and withdrawing, the user already has received their reputation bonus for carbon voting
      const repInitial = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[3]);
      await contracts.daoStakeLocking.lockDGD(amount, { from: addressOf.dgdHolders[3] });
      const repAfterLock = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[3]);
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[3]), bN(2));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[3]), bN(0));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatReputationWasUpdated.call(addressOf.dgdHolders[3]), bN(1));
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[3]), true);
      await contracts.daoStakeLocking.withdrawDGD(amount, { from: addressOf.dgdHolders[3] });
      const repAfterWithdraw = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[3]);
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolders[3]), bN(0));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolders[3]), bN(0));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatReputationWasUpdated.call(addressOf.dgdHolders[3]), bN(1));
      assert.deepEqual(await contracts.daoStakeLocking.isParticipant.call(addressOf.dgdHolders[3]), false);

      // teleport to Q4 locking phase
      const _startOfFirstQuarter = getStartOfFirstQuarterFor(bN(3), phases.LOCKING_PHASE, dummyConfig[0], dummyConfig[1], bN(getCurrentTimestamp()), bN);
      await setStartOfFirstQuarterTo(contracts, addressOf, _startOfFirstQuarter);
      await initQuarter(contracts, bN(3), bN(getCurrentTimestamp()));

      await contracts.daoStakeLocking.lockDGD(amount, { from: addressOf.dgdHolders[3] });
      const repAfterLockAgain = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[3]);

      // reputation verifying
      assert.deepEqual(repAfterLock, repInitial.plus(bN(35)));
      assert.deepEqual(repAfterWithdraw, repAfterLock);
      // fine for (not locking + max deduction) in Q2
      assert.deepEqual(repAfterLockAgain, repAfterWithdraw.minus(bN(25)));
    });
  });
});
