const a = require('awaiting');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  registerInteractive,
} = require('../setup');

// const {
//   EMPTY_ADDRESS,
// } = require('../daoHelpers');

const {
  getCurrentTimestamp,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoRewardsStorage', function (accounts) {
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
      assert.deepEqual(await resolver.get_contract.call('s:dao:rewardsstorage'), contracts.daoRewardsStorage.address);
    });
  });

  describe('updateQuarterInfo', function () {
    it('[valid call]: verify read function', async function () {
      const quarterId = bN(1);
      const minimalParticipationPoint = bN(4);
      const quarterPointScalingFactor = bN(30);
      const totalEffectiveDGD = bN(50 * (10 ** 18));
      const dgxDistributionDay = getCurrentTimestamp() + 360000;
      const dgxRewardsPool = bN(25 * (10 ** 9));
      assert.ok(await contracts.daoRewardsStorage.updateQuarterInfo.call(
        quarterId,
        minimalParticipationPoint,
        quarterPointScalingFactor,
        totalEffectiveDGD,
        bN(dgxDistributionDay),
        dgxRewardsPool,
        { from: accounts[0] },
      ));
      await contracts.daoRewardsStorage.updateQuarterInfo(
        quarterId,
        minimalParticipationPoint,
        quarterPointScalingFactor,
        totalEffectiveDGD,
        bN(dgxDistributionDay),
        dgxRewardsPool,
        { from: accounts[0] },
      );
      const quarterInfo = await contracts.daoRewardsStorage.readQuarterInfo.call(quarterId);
      assert.deepEqual(quarterInfo[0], minimalParticipationPoint);
      assert.deepEqual(quarterInfo[1], quarterPointScalingFactor);
      assert.deepEqual(quarterInfo[2], totalEffectiveDGD);
      assert.deepEqual(quarterInfo[3], bN(dgxDistributionDay));
      assert.deepEqual(quarterInfo[4], dgxRewardsPool);
      await contracts.daoRewardsStorage.updateQuarterInfo(
        quarterId,
        minimalParticipationPoint.plus(bN(1)),
        quarterPointScalingFactor.plus(bN(5)),
        totalEffectiveDGD,
        bN(dgxDistributionDay),
        dgxRewardsPool,
        { from: accounts[0] },
      );
      const quarterInfo2 = await contracts.daoRewardsStorage.readQuarterInfo.call(quarterId);
      assert.deepEqual(quarterInfo2[0], minimalParticipationPoint.plus(bN(1)));
      assert.deepEqual(quarterInfo2[1], quarterPointScalingFactor.plus(bN(5)));
      assert.deepEqual(quarterInfo2[2], totalEffectiveDGD);
      assert.deepEqual(quarterInfo2[3], bN(dgxDistributionDay));
      assert.deepEqual(quarterInfo2[4], dgxRewardsPool);
    });
    it('[not called by DAO_REWARDS_MANAGER]: revert', async function () {
      const quarterId = bN(2);
      const minimalParticipationPoint = bN(3);
      const quarterPointScalingFactor = bN(30);
      const totalEffectiveDGD = bN(45 * (10 ** 18));
      const dgxDistributionDay = getCurrentTimestamp() + 360000;
      const dgxRewardsPool = bN(20 * (10 ** 9));
      for (let i = 1; i < 20; i++) {
        assert(await a.failure(contracts.daoRewardsStorage.updateQuarterInfo.call(
          quarterId,
          minimalParticipationPoint,
          quarterPointScalingFactor,
          totalEffectiveDGD,
          dgxDistributionDay,
          dgxRewardsPool,
          { from: accounts[i] },
        )));
      }
    });
  });

  describe('updateReputationPointAtQuarter', function () {
    it('[valid call]: verify read function', async function () {
      const reputationPoint = bN(10);
      assert.ok(await contracts.daoRewardsStorage.updateReputationPointAtQuarter.call(
        addressOf.dgdHolder3,
        bN(1),
        reputationPoint,
        { from: accounts[0] },
      ));
      await contracts.daoRewardsStorage.updateReputationPointAtQuarter(
        addressOf.dgdHolder3,
        bN(1),
        reputationPoint,
        { from: accounts[0] },
      );
      assert.deepEqual(await contracts.daoRewardsStorage.readReputationPointAtQuarter.call(addressOf.dgdHolder3, bN(1)), reputationPoint);
      const reputationPoint2 = bN(12);
      await contracts.daoRewardsStorage.updateReputationPointAtQuarter(
        addressOf.dgdHolder3,
        bN(1),
        reputationPoint2,
        { from: accounts[0] },
      );
      assert.deepEqual(await contracts.daoRewardsStorage.readReputationPointAtQuarter.call(addressOf.dgdHolder3, bN(1)), reputationPoint2);
    });
    it('[not called by DAO_REWARDS_MANAGER]: revert', async function () {
      const reputationPoint = bN(8);
      for (let i = 1; i < 20; i++) {
        assert(await a.failure(contracts.daoRewardsStorage.updateReputationPointAtQuarter.call(
          addressOf.dgdHolder3,
          bN(1),
          reputationPoint,
          { from: accounts[i] },
        )));
      }
    });
  });

  describe('updateClaimableDGX', function () {
    it('[valid call]: verify read function', async function () {
      const value = bN(2 * (10 ** 9));
      const value2 = bN(3 * (10 ** 9));
      const value3 = bN(4 * (10 ** 9));
      await contracts.daoRewardsStorage.updateClaimableDGX(addressOf.dgdHolder2, value);
      await contracts.daoRewardsStorage.updateClaimableDGX(addressOf.dgdHolder2, value2);
      await contracts.daoRewardsStorage.updateClaimableDGX(addressOf.dgdHolder3, value3);
      assert.deepEqual(await contracts.daoRewardsStorage.claimableDGXs.call(addressOf.dgdHolder2), value2);
      assert.deepEqual(await contracts.daoRewardsStorage.claimableDGXs.call(addressOf.dgdHolder3), value3);
    });
    it('[not called by DAO_REWARDS_MANAGER]: revert', async function () {
      const value = bN(2 * (10 ** 9));
      for (let i = 1; i < 20; i++) {
        assert(await a.failure(contracts.daoRewardsStorage.updateClaimableDGX.call(
          addressOf.dgdHolder3,
          value,
          { from: accounts[i] },
        )));
      }
    });
  });

  describe('updateLastParticipatedQuarter', function () {
    it('[valid call]: verify read function', async function () {
      const lastQuarter = bN(1);
      await contracts.daoRewardsStorage.updateLastParticipatedQuarter(
        addressOf.dgdHolder2,
        lastQuarter,
        { from: accounts[0] },
      );
      await contracts.daoRewardsStorage.updateLastParticipatedQuarter(
        addressOf.dgdHolder2,
        lastQuarter.plus(bN(1)),
        { from: accounts[0] },
      );
      await contracts.daoRewardsStorage.updateLastParticipatedQuarter(
        addressOf.dgdHolder3,
        lastQuarter.plus(bN(2)),
        { from: accounts[0] },
      );
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolder2), lastQuarter.plus(bN(1)));
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.dgdHolder3), lastQuarter.plus(bN(2)));
    });
    it('[not called by DAO_REWARDS_MANAGER]: revert', async function () {
      const lastQuarter = bN(2);
      for (let i = 1; i < 20; i++) {
        assert(await a.failure(contracts.daoRewardsStorage.updateLastParticipatedQuarter.call(
          addressOf.dgdHolder3,
          lastQuarter,
          { from: accounts[i] },
        )));
      }
    });
  });

  describe('updateLastQuarterThatRewardsWasUpdated', function () {
    it('[valid call]: verify read function', async function () {
      const lastQuarter = bN(2);
      await contracts.daoRewardsStorage.updateLastQuarterThatRewardsWasUpdated(addressOf.dgdHolder2, lastQuarter.minus(bN(1)));
      await contracts.daoRewardsStorage.updateLastQuarterThatRewardsWasUpdated(addressOf.dgdHolder2, lastQuarter);
      await contracts.daoRewardsStorage.updateLastQuarterThatRewardsWasUpdated(addressOf.dgdHolder3, lastQuarter.plus(bN(1)));
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolder2), lastQuarter);
      assert.deepEqual(await contracts.daoRewardsStorage.lastQuarterThatRewardsWasUpdated.call(addressOf.dgdHolder3), lastQuarter.plus(bN(1)));
    });
    it('[not called by DAO_REWARDS_MANAGER]: revert', async function () {
      const lastQuarter = bN(2);
      for (let i = 1; i < 20; i++) {
        assert(await a.failure(contracts.daoRewardsStorage.updateLastQuarterThatRewardsWasUpdated.call(
          addressOf.dgdHolder3,
          lastQuarter,
          { from: accounts[i] },
        )));
      }
    });
  });
});
