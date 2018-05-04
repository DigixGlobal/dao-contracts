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
const someReputationPoints = randomBigNumbers(bN, 10);

contract('DaoPointsStorage', function (accounts) {
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
      assert.deepEqual(await resolver.get_contract.call('c:dao:points:storage'), contracts.daoPointsStorage.address);
    });
  });

  describe('addQuarterPoint', function () {
    it('[not called by INTERACTIVE]: revert', async function () {
      assert(await a.failure(contracts.daoPointsStorage.addQuarterPoint.call(
        addressOf.dgdHolder1,
        someQuarterPoints[0],
        { from: accounts[1] },
      )));
    });
    it('[add quarter points]: verify balance and total supply', async function () {
      const quarterId = bN(1);
      assert.deepEqual(await contracts.daoPointsStorage.addQuarterPoint.call(
        addressOf.dgdHolder1,
        someQuarterPoints[0],
        quarterId,
      ), true);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolder1, someQuarterPoints[0], quarterId);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolder2, someQuarterPoints[1], quarterId);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolder1, someQuarterPoints[2], quarterId);

      // check balance and total supply
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolder1, quarterId),
                          someQuarterPoints[0].plus(someQuarterPoints[2]));
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolder2, quarterId),
                          someQuarterPoints[1]);
      assert.deepEqual(await contracts.daoPointsStorage.getTotalQuarterPoint.call(quarterId),
                          someQuarterPoints[0].plus(someQuarterPoints[1]).plus(someQuarterPoints[2]));
    });
    it('[multiple quarters]: verify balance and total supply', async function () {
      const quarterTwo = bN(2);
      const quarterThree = bN(3);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolder3, someQuarterPoints[3], quarterTwo);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolder2, someQuarterPoints[4], quarterTwo);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolder2, someQuarterPoints[5], quarterTwo);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolder1, someQuarterPoints[6], quarterTwo);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolder4, someQuarterPoints[7], quarterTwo);
      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolder1, someQuarterPoints[8], quarterTwo);

      await contracts.daoPointsStorage.addQuarterPoint(addressOf.dgdHolder4, someQuarterPoints[9], quarterThree);

      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolder1, quarterTwo),
                          someQuarterPoints[6].plus(someQuarterPoints[8]));
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolder2, quarterTwo),
                          someQuarterPoints[4].plus(someQuarterPoints[5]));
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolder3, quarterTwo),
                          someQuarterPoints[3]);
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolder4, quarterTwo),
                          someQuarterPoints[7]);

      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolder1, quarterThree),
                          bN(0));
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolder2, quarterThree),
                          bN(0));
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolder3, quarterThree),
                          bN(0));
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.dgdHolder4, quarterThree),
                          someQuarterPoints[9]);

      const totalSupplyQuarterTwo = someQuarterPoints[3].plus(someQuarterPoints[4]).plus(someQuarterPoints[5])
                                      .plus(someQuarterPoints[6]).plus(someQuarterPoints[7]).plus(someQuarterPoints[8]);
      assert.deepEqual(await contracts.daoPointsStorage.getTotalQuarterPoint.call(quarterTwo),
                          totalSupplyQuarterTwo);
      assert.deepEqual(await contracts.daoPointsStorage.getTotalQuarterPoint.call(quarterThree),
                          someQuarterPoints[9]);
    });
  });

  describe('addReputation', function () {
    it('[not called by INTERACTIVE]: revert', async function () {
      assert(await a.failure(contracts.daoPointsStorage.addReputation.call(
        addressOf.dgdHolder1,
        someReputationPoints[0],
        { from: accounts[3] },
      )));
    });
    it('[add reputation]: verify balance', async function () {
      await contracts.daoPointsStorage.addReputation(addressOf.dgdHolder1, someReputationPoints[0]);
      await contracts.daoPointsStorage.addReputation(addressOf.dgdHolder1, someReputationPoints[1]);
      await contracts.daoPointsStorage.addReputation(addressOf.dgdHolder2, someReputationPoints[2]);

      // verify get functions
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolder1), someReputationPoints[0].plus(someReputationPoints[1]));
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolder2), someReputationPoints[2]);
      const totalReputation = someReputationPoints[0].plus(someReputationPoints[1]).plus(someReputationPoints[2]);
      assert.deepEqual(await contracts.daoPointsStorage.getTotalReputation.call(), totalReputation);
    });
  });

  describe('subtractReputation', function () {
    it('[not called by INTERACTIVE]: revert', async function () {
      assert(await a.failure(contracts.daoPointsStorage.subtractReputation.call(
        addressOf.dgdHolder1,
        bN(20),
        { from: accounts[2] },
      )));
    });
    it('[subtract less than user rep]: verify get functions', async function () {
      const rep1 = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolder1);
      const totalBefore = await contracts.daoPointsStorage.getTotalReputation.call();
      const toSubtract = randomBigNumber(bN, rep1); // a random number smaller than user rep
      await contracts.daoPointsStorage.subtractReputation(addressOf.dgdHolder1, toSubtract);

      // verify get and total
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolder1), rep1.minus(toSubtract));
      assert.deepEqual(await contracts.daoPointsStorage.getTotalReputation.call(), totalBefore.minus(toSubtract));
    });
    it('[subtract more than user reputation]: reputation is zero, only that much is subtracted from total', async function () {
      await contracts.daoPointsStorage.addReputation(addressOf.dgdHolder3, someReputationPoints[4]);
      await contracts.daoPointsStorage.addReputation(addressOf.dgdHolder4, someReputationPoints[5]);
      await contracts.daoPointsStorage.addReputation(addressOf.dgdHolder1, someReputationPoints[6]);

      const rep2 = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolder2);
      const totalBefore = await contracts.daoPointsStorage.getTotalReputation.call();
      const toSubtract = rep2.plus(randomBigNumber(bN, 100)); // a random number greater than user rep
      await contracts.daoPointsStorage.subtractReputation(addressOf.dgdHolder2, toSubtract);

      // verify get and total
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolder2), bN(0));
      assert.deepEqual(await contracts.daoPointsStorage.getTotalReputation.call(), totalBefore.minus(rep2));
    });
    it('[subtract more than total reputation]: user rep is zero, total rep is reduced by only user rep', async function () {
      const rep3 = await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolder3);
      const totalBefore = await contracts.daoPointsStorage.getTotalReputation.call();
      const toSubtract = totalBefore.plus(randomBigNumber(bN, 1000)); // to subtract more than the total rep
      await contracts.daoPointsStorage.subtractReputation(addressOf.dgdHolder3, toSubtract);

      // verify get and total
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.dgdHolder3), bN(0));
      assert.deepEqual(await contracts.daoPointsStorage.getTotalReputation.call(), totalBefore.minus(rep3));
    });
  });
});
