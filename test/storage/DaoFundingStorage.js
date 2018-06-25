const a = require('awaiting');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  registerInteractive,
} = require('../setup');

const {
  randomBigNumbers,
  randomBigNumber,
  randomAddresses,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoFundingStorage', function (accounts) {
  let libs;
  let addressOf;
  let contracts;

  before(async function () {
    libs = {};
    contracts = {};
    addressOf = {};
    await deployLibraries(libs);
    await deployNewContractResolver(contracts);
    await getAccountsAndAddressOf(accounts, addressOf);
    await deployStorage(libs, contracts, contracts.resolver, addressOf);
    await registerInteractive(contracts.resolver, addressOf);
  });

  describe('Initialization', function () {
    it('[contract key]', async function () {
      assert.deepEqual(await contracts.resolver.get_contract.call('storage:dao:funding'), contracts.daoFundingStorage.address);
    });
  });

  describe('addEth', function () {
    const amount = randomBigNumber(bN);
    it('[not called from CONTRACT_DAO_FUNDING_MANAGER]: revert', async function () {
      for (let i = 1; i < 20; i++) {
        assert(await a.failure(contracts.daoFundingStorage.addEth.call(
          amount,
          { from: accounts[i] },
        )));
      }
    });
    it('[valid call]: verify read function', async function () {
      assert.ok(await contracts.daoFundingStorage.addEth.call(amount));
      await contracts.daoFundingStorage.addEth(amount);
      assert.deepEqual(await contracts.daoFundingStorage.ethInDao.call(), amount);
      const anotherAmount = randomBigNumber(bN);
      await contracts.daoFundingStorage.addEth(anotherAmount);
      assert.deepEqual(await contracts.daoFundingStorage.ethInDao.call(), amount.plus(anotherAmount));
    });
  });

  describe('withdrawEth', function () {
    it('[not called from CONTRACT_DAO_FUNDING_MANAGER]: revert', async function () {
      const amount = bN(100);
      assert.isAtLeast((await contracts.daoFundingStorage.ethInDao.call()).toNumber(), amount.toNumber());
      for (let i = 1; i < 20; i++) {
        assert(await a.failure(contracts.daoFundingStorage.withdrawEth.call(
          amount,
          { from: accounts[i] },
        )));
      }
    });
    it('[valid call]: verify read function', async function () {
      const amount = bN(1000);
      const ethInDaoBefore = await contracts.daoFundingStorage.ethInDao.call();
      assert.ok(await contracts.daoFundingStorage.withdrawEth.call(amount));
      await contracts.daoFundingStorage.withdrawEth(amount);
      assert.deepEqual(await contracts.daoFundingStorage.ethInDao.call(), ethInDaoBefore.minus(amount));
    });
  });

  describe('updateClaimableEth', function () {
    const users = randomAddresses(2);
    const amounts = randomBigNumbers(bN, 2);
    it('[not called from CONTRACT_DAO_FUNDING_MANAGER]: revert', async function () {
      for (let i = 1; i < 20; i++) {
        assert(await a.failure(contracts.daoFundingStorage.updateClaimableEth.call(
          users[0],
          amounts[0],
          { from: accounts[i] },
        )));
      }
    });
    it('[valid call]: verify read function', async function () {
      assert.ok(await contracts.daoFundingStorage.updateClaimableEth.call(
        users[0],
        amounts[0],
      ));
      await contracts.daoFundingStorage.updateClaimableEth(users[0], amounts[0]);
      await contracts.daoFundingStorage.updateClaimableEth(users[1], amounts[1]);
      assert.deepEqual(await contracts.daoFundingStorage.claimableEth.call(users[0]), amounts[0]);
      assert.deepEqual(await contracts.daoFundingStorage.claimableEth.call(users[1]), amounts[1]);
    });
  });
});
