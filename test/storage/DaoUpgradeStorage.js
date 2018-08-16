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
  randomAddress,
} = require('@digix/helpers/lib/helpers');

const {
  EMPTY_ADDRESS,
} = require('../daoHelpers');

const bN = web3.toBigNumber;

contract('DaoUpgradeStorage', function (accounts) {
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
    it('[verify key]', async function () {
      assert.deepEqual(await contracts.resolver.get_contract.call('storage:dao:upgradable'), contracts.daoUpgradeStorage.address);
    });
  });

  describe('setStartOfFirstQuarter', function () {
    it('[not sent by CONTRACT_DAO]: revert', async function () {
      assert(await a.failure(contracts.daoUpgradeStorage.setStartOfFirstQuarter.call(
        randomBigNumber(bN),
        { from: accounts[2] },
      )));
    });
    it('[valid call]: set start, read', async function () {
      const start = randomBigNumber(bN);
      await contracts.daoUpgradeStorage.setStartOfFirstQuarter(start);
      assert.deepEqual(await contracts.daoUpgradeStorage.startOfFirstQuarter.call(), start);
    });
  });

  describe('updateForDaoMigration', function () {
    it('[not called by CONTRACT_DAO]: revert', async function () {
      assert(await a.failure(contracts.daoUpgradeStorage.updateForDaoMigration.call(
        randomAddress(),
        randomAddress(),
        { from: accounts[4] },
      )));
    });
    it('[valid call]: set the values', async function () {
      const newDaoFundingManager = randomAddress();
      const newDao = randomAddress();
      assert.deepEqual(await contracts.daoUpgradeStorage.isReplacedByNewDao.call(), false);
      assert.deepEqual(await contracts.daoUpgradeStorage.newDaoFundingManager.call(), EMPTY_ADDRESS);
      assert.deepEqual(await contracts.daoUpgradeStorage.newDaoContract.call(), EMPTY_ADDRESS);
      await contracts.daoUpgradeStorage.updateForDaoMigration(
        newDaoFundingManager,
        newDao,
      );

      assert.deepEqual(await contracts.daoUpgradeStorage.isReplacedByNewDao.call(), true);
      assert.deepEqual(await contracts.daoUpgradeStorage.newDaoFundingManager.call(), newDaoFundingManager);
      assert.deepEqual(await contracts.daoUpgradeStorage.newDaoContract.call(), newDao);
    });
  });
});
