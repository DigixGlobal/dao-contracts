const a = require('awaiting');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  registerInteractive,
} = require('../setup');

const {
  randomBigNumber,
  randomBigNumbers,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

const someQuarterPoints = randomBigNumbers(bN, 10);
const someQuarterBadgePoints = randomBigNumbers(bN, 10);
const someReputationPoints = randomBigNumbers(bN, 10);

contract('DaoPointsStorage', function (accounts) {
  let libs;
  let addressOf;
  let contracts;

  before(async function () {
    contracts = {};
    libs = {};
    addressOf = {};
    await deployLibraries(libs);
    await deployNewContractResolver(contracts);
    await getAccountsAndAddressOf(accounts, addressOf);
    await deployStorage(libs, contracts, contracts.resolver, addressOf);
    await registerInteractive(contracts.resolver, addressOf);
  });

  describe('Initialization', function () {
    it('[contract key]', async function () {
      assert.deepEqual(await contracts.resolver.get_contract.call('storage:dao:points'), contracts.daoPointsStorage.address);
    });
  });

  describe('addQuarterPoint', function () {
    it('[not called by CONTRACT_DAO_VOTING or CONTRACT_DAO_VOTING_CLAIMS]: revert', async function () {
      assert(await a.failure(contracts.daoPointsStorage.addQuarterPoint.call(
        addressOf.dgdHolders[0],
        someQuarterPoints[0],
        { from: accounts[1] },
      )));
    });
    it('[add quarter points]: verify balance and total supply', async function () {
      const quarterId = bN(1);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[0], someQuarterPoints[0], quarterId);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[1], someQuarterPoints[1], quarterId);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[0], someQuarterPoints[2], quarterId);

      // check balance and total supply
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[0], quarterId),
        someQuarterPoints[0].plus(someQuarterPoints[2]),
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[1], quarterId),
        someQuarterPoints[1],
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getTotalQuarterPoint.call(quarterId),
        someQuarterPoints[0].plus(someQuarterPoints[1]).plus(someQuarterPoints[2]),
      );
    });
    it('[multiple quarters]: verify balance and total supply', async function () {
      const quarterTwo = bN(2);
      const quarterThree = bN(3);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[2], someQuarterPoints[3], quarterTwo);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[1], someQuarterPoints[4], quarterTwo);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[1], someQuarterPoints[5], quarterTwo);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[0], someQuarterPoints[6], quarterTwo);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[2], someQuarterPoints[7], quarterTwo);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[0], someQuarterPoints[8], quarterTwo);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolders[2], someQuarterPoints[9], quarterThree);

      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[0], quarterTwo),
        someQuarterPoints[6].plus(someQuarterPoints[8]),
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[1], quarterTwo),
        someQuarterPoints[4].plus(someQuarterPoints[5]),
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[2], quarterTwo),
        someQuarterPoints[3].plus(someQuarterPoints[7]),
      );

      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[0], quarterThree),
        bN(0),
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[1], quarterThree),
        bN(0),
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolders[2], quarterThree),
        someQuarterPoints[9],
      );

      const totalSupplyQuarterTwo = someQuarterPoints[3].plus(someQuarterPoints[4]).plus(someQuarterPoints[5])
        .plus(someQuarterPoints[6]).plus(someQuarterPoints[7])
        .plus(someQuarterPoints[8]);
      assert.deepEqual(
        await contracts.daoPointsStorage.getTotalQuarterPoint.call(quarterTwo),
        totalSupplyQuarterTwo,
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getTotalQuarterPoint.call(quarterThree),
        someQuarterPoints[9],
      );
    });
  });

  describe('addModeratorQuarterPoint', function () {
    it('[not called by CONTRACT_DAO_VOTING or CONTRACT_DAO_VOTING_CLAIMS]: revert', async function () {
      assert(await a.failure(contracts.daoPointsStorage.addModeratorQuarterPoint.call(
        addressOf.dgdHolders[0],
        someQuarterBadgePoints[0],
        { from: accounts[1] },
      )));
    });
    it('[add quarter points]: verify balance and total supply', async function () {
      const quarterId = bN(1);
      await contracts.daoPointsStorage.addModeratorQuarterPoint(addressOf.dgdHolders[0], someQuarterBadgePoints[0], quarterId);
      await contracts.daoPointsStorage.addModeratorQuarterPoint(addressOf.dgdHolders[1], someQuarterBadgePoints[1], quarterId);
      await contracts.daoPointsStorage.addModeratorQuarterPoint(addressOf.dgdHolders[0], someQuarterBadgePoints[2], quarterId);

      // check balance and total supply
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.dgdHolders[0], quarterId),
        someQuarterBadgePoints[0].plus(someQuarterBadgePoints[2]),
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.dgdHolders[1], quarterId),
        someQuarterBadgePoints[1],
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getTotalQuarterModeratorPoint.call(quarterId),
        someQuarterBadgePoints[0].plus(someQuarterBadgePoints[1]).plus(someQuarterBadgePoints[2]),
      );
    });
    it('[multiple quarters]: verify balance and total supply', async function () {
      const quarterTwo = bN(2);
      const quarterThree = bN(3);
      await contracts.daoPointsStorage.addModeratorQuarterPoint(addressOf.dgdHolders[2], someQuarterBadgePoints[3], quarterTwo);
      await contracts.daoPointsStorage.addModeratorQuarterPoint(addressOf.dgdHolders[1], someQuarterBadgePoints[4], quarterTwo);
      await contracts.daoPointsStorage.addModeratorQuarterPoint(addressOf.dgdHolders[1], someQuarterBadgePoints[5], quarterTwo);
      await contracts.daoPointsStorage.addModeratorQuarterPoint(addressOf.dgdHolders[0], someQuarterBadgePoints[6], quarterTwo);
      await contracts.daoPointsStorage.addModeratorQuarterPoint(addressOf.dgdHolders[2], someQuarterBadgePoints[7], quarterTwo);
      await contracts.daoPointsStorage.addModeratorQuarterPoint(addressOf.dgdHolders[0], someQuarterBadgePoints[8], quarterTwo);
      await contracts.daoPointsStorage.addModeratorQuarterPoint(addressOf.dgdHolders[2], someQuarterBadgePoints[9], quarterThree);

      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.dgdHolders[0], quarterTwo),
        someQuarterBadgePoints[6].plus(someQuarterBadgePoints[8]),
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.dgdHolders[1], quarterTwo),
        someQuarterBadgePoints[4].plus(someQuarterBadgePoints[5]),
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.dgdHolders[2], quarterTwo),
        someQuarterBadgePoints[3].plus(someQuarterBadgePoints[7]),
      );

      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.dgdHolders[0], quarterThree),
        bN(0),
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.dgdHolders[1], quarterThree),
        bN(0),
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.dgdHolders[2], quarterThree),
        someQuarterBadgePoints[9],
      );

      const totalSupplyQuarterTwo = someQuarterBadgePoints[3].plus(someQuarterBadgePoints[4]).plus(someQuarterBadgePoints[5])
        .plus(someQuarterBadgePoints[6]).plus(someQuarterBadgePoints[7])
        .plus(someQuarterBadgePoints[8]);
      assert.deepEqual(
        await contracts.daoPointsStorage.getTotalQuarterModeratorPoint.call(quarterTwo),
        totalSupplyQuarterTwo,
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getTotalQuarterModeratorPoint.call(quarterThree),
        someQuarterBadgePoints[9],
      );
    });
  });

  describe('increaseReputation', function () {
    it('[not called by CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_REWARDS_MANAGER]: revert', async function () {
      assert(await a.failure(contracts.daoPointsStorage.increaseReputation.call(
        addressOf.dgdHolders[0],
        someReputationPoints[0],
        { from: accounts[3] },
      )));
    });
    it('[add reputation]: verify balance', async function () {
      await contracts.daoPointsStorage.increaseReputation(addressOf.dgdHolders[0], someReputationPoints[0]);
      await contracts.daoPointsStorage.increaseReputation(addressOf.dgdHolders[0], someReputationPoints[1]);
      await contracts.daoPointsStorage.increaseReputation(addressOf.dgdHolders[1], someReputationPoints[2]);

      // verify get functions
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[0]), someReputationPoints[0].plus(someReputationPoints[1]));
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[1]), someReputationPoints[2]);
      const totalReputation = someReputationPoints[0].plus(someReputationPoints[1]).plus(someReputationPoints[2]);
      assert.deepEqual(await contracts.daoPointsStorage.getTotalReputation.call(), totalReputation);
    });
  });

  describe('reduceReputation', function () {
    it('[not called by CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_REWARDS_MANAGER]: revert', async function () {
      assert(await a.failure(contracts.daoPointsStorage.reduceReputation.call(
        addressOf.dgdHolders[0],
        bN(20),
        { from: accounts[2] },
      )));
    });
    it('[subtract less than user rep]: verify get functions', async function () {
      const rep1 = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[0]);
      const totalBefore = await contracts.daoPointsStorage.getTotalReputation.call();
      const toSubtract = randomBigNumber(bN, rep1); // a random number smaller than user rep
      await contracts.daoPointsStorage.reduceReputation(addressOf.dgdHolders[0], toSubtract);

      // verify get and total
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[0]), rep1.minus(toSubtract));
      assert.deepEqual(await contracts.daoPointsStorage.getTotalReputation.call(), totalBefore.minus(toSubtract));
    });
    it('[subtract more than user reputation]: reputation is zero, only that much is subtracted from total', async function () {
      await contracts.daoPointsStorage.increaseReputation(addressOf.dgdHolders[2], someReputationPoints[4]);
      await contracts.daoPointsStorage.increaseReputation(addressOf.dgdHolders[2], someReputationPoints[5]);
      await contracts.daoPointsStorage.increaseReputation(addressOf.dgdHolders[0], someReputationPoints[6]);

      const rep2 = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[1]);
      const totalBefore = await contracts.daoPointsStorage.getTotalReputation.call();
      const toSubtract = rep2.plus(randomBigNumber(bN, 100)); // a random number greater than user rep
      await contracts.daoPointsStorage.reduceReputation(addressOf.dgdHolders[1], toSubtract);

      // verify get and total
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[1]), bN(0));
      assert.deepEqual(await contracts.daoPointsStorage.getTotalReputation.call(), totalBefore.minus(rep2));
    });
    it('[subtract more than total reputation]: user rep is zero, total rep is reduced by only user rep', async function () {
      const rep3 = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[2]);
      const totalBefore = await contracts.daoPointsStorage.getTotalReputation.call();
      const toSubtract = totalBefore.plus(randomBigNumber(bN, 1000)); // to subtract more than the total rep
      await contracts.daoPointsStorage.reduceReputation(addressOf.dgdHolders[2], toSubtract);

      // verify get and total
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolders[2]), bN(0));
      assert.deepEqual(await contracts.daoPointsStorage.getTotalReputation.call(), totalBefore.minus(rep3));
    });
  });
});
