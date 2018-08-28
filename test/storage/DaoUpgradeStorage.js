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
  randomAddresses,
} = require('@digix/helpers/lib/helpers');

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
      assert.deepEqual(await contracts.resolver.get_contract.call('storage:dao:upgrade'), contracts.daoUpgradeStorage.address);
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

  describe('setNewContractAddresses', function () {
    it('[not called from CONTRACT_DAO]: revert', async function () {
      assert(await a.failure(contracts.daoUpgradeStorage.setNewContractAddresses.call(
        randomAddress(),
        randomAddress(),
        randomAddress(),
        { from: accounts[1] },
      )));
    });
    it('[valid call]: update address, read', async function () {
      const addresses = randomAddresses(3);
      assert.ok(await contracts.daoUpgradeStorage.setNewContractAddresses.call(
        addresses[0],
        addresses[1],
        addresses[2],
      ));
      await contracts.daoUpgradeStorage.setNewContractAddresses(
        addresses[0],
        addresses[1],
        addresses[2],
      );
      assert.deepEqual(await contracts.daoUpgradeStorage.newDaoContract.call(), addresses[0]);
      assert.deepEqual(await contracts.daoUpgradeStorage.newDaoFundingManager.call(), addresses[1]);
      assert.deepEqual(await contracts.daoUpgradeStorage.newDaoRewardsManager.call(), addresses[2]);
    });
  });

  describe('updateForDaoMigration', function () {
    it('[not called by CONTRACT_DAO]: revert', async function () {
      assert(await a.failure(contracts.daoUpgradeStorage.updateForDaoMigration.call({ from: accounts[4] })));
    });
    it('[valid call]: set the values', async function () {
      assert.deepEqual(await contracts.daoUpgradeStorage.isReplacedByNewDao.call(), false);
      await contracts.daoUpgradeStorage.updateForDaoMigration();

      assert.deepEqual(await contracts.daoUpgradeStorage.isReplacedByNewDao.call(), true);
    });
  });
});
