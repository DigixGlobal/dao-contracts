const a = require('awaiting');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  registerInteractive,
} = require('../setup');

const {
  randomAddress,
  randomBigNumber,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoCollateralStorage', function (accounts) {
  let libs;
  let addressOf;
  let contracts;
  const user1 = randomAddress();
  const user2 = randomAddress();

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
    it('[verify key]', async function () {
      assert.deepEqual(await contracts.resolver.get_contract.call('storage:dao:collateral'), contracts.daoCollateralStorage.address);
    });
  });

  describe('lockCollateral', function () {
    it('[not called by CONTRACT_DAO]: revert', async function () {
      assert(await a.failure(contracts.daoCollateralStorage.lockCollateral.call(
        randomAddress(),
        randomBigNumber(bN),
        { from: accounts[2] },
      )));
    });
    it('[valid call]: read functions', async function () {
      const value = randomBigNumber(bN);
      await contracts.daoCollateralStorage.lockCollateral(
        user1,
        value,
      );
      assert.deepEqual(await contracts.daoCollateralStorage.readLockedCollateral.call(user1), value);

      const value1 = randomBigNumber(bN);
      const value2 = randomBigNumber(bN);
      await contracts.daoCollateralStorage.lockCollateral(
        user1,
        value1,
      );
      await contracts.daoCollateralStorage.lockCollateral(
        user1,
        value2,
      );
      assert.deepEqual(await contracts.daoCollateralStorage.readLockedCollateral.call(user1), value.plus(value1).plus(value2));

      await contracts.daoCollateralStorage.lockCollateral(
        user2,
        randomBigNumber(bN),
      );
    });
  });

  describe('unlockCollateral', function () {
    let value1;
    let value2;
    before(async function () {
      value1 = await contracts.daoCollateralStorage.readLockedCollateral.call(user1);
      value2 = await contracts.daoCollateralStorage.readLockedCollateral.call(user2);
    });
    it('[not called by CONTRACT_DAO_VOTING_CLAIMS]: revert', async function () {
      const value = randomBigNumber(bN, value1);
      assert(await a.failure(contracts.daoCollateralStorage.unlockCollateral.call(
        user1,
        value,
        { from: accounts[3] },
      )));
    });
    it('[valid call]: read functions', async function () {
      let value = randomBigNumber(bN, value1);
      await contracts.daoCollateralStorage.unlockCollateral(
        user1,
        value,
      );

      assert.deepEqual(await contracts.daoCollateralStorage.readLockedCollateral.call(user1), value1.minus(value));
      assert.deepEqual(await contracts.daoCollateralStorage.readUnlockedCollateral.call(user1), value);

      value = randomBigNumber(bN, value2);
      await contracts.daoCollateralStorage.unlockCollateral(
        user2,
        value,
      );

      assert.deepEqual(await contracts.daoCollateralStorage.readLockedCollateral.call(user2), value2.minus(value));
      assert.deepEqual(await contracts.daoCollateralStorage.readUnlockedCollateral.call(user2), value);
    });
  });

  describe('withdrawCollateral', function () {
    let value1;
    let value2;
    before(async function () {
      value1 = await contracts.daoCollateralStorage.readUnlockedCollateral.call(user1);
      value2 = await contracts.daoCollateralStorage.readUnlockedCollateral.call(user2);
    });
    it('[not called by CONTRACT_DAO_FUNDING_MANAGER]: revert', async function () {
      const value = randomBigNumber(bN, value1);
      assert(await a.failure(contracts.daoCollateralStorage.withdrawCollateral.call(
        user1,
        value,
        { from: accounts[3] },
      )));
    });
    it('[valid call]: read functions', async function () {
      let value = randomBigNumber(bN, value1);
      await contracts.daoCollateralStorage.withdrawCollateral(
        user1,
        value,
      );

      assert.deepEqual(await contracts.daoCollateralStorage.readUnlockedCollateral.call(user1), value1.minus(value));

      value = randomBigNumber(bN, value2);
      await contracts.daoCollateralStorage.withdrawCollateral(
        user2,
        value,
      );

      assert.deepEqual(await contracts.daoCollateralStorage.readUnlockedCollateral.call(user2), value2.minus(value));
    });
  });
});
