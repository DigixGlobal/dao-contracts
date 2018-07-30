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
} = require('@digix/helpers/lib/helpers');

contract('DaoWhitelistingStorage', function (accounts) {
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
      assert.deepEqual(await contracts.resolver.get_contract.call('storage:dao:whitelisting'), contracts.daoWhitelistingStorage.address);
    });
  });

  describe('[setWhitelisted]', function () {
    let whitelistedAddress;
    it('[not called by CONTRACT_DAO_WHITELISTING]: revert', async function () {
      assert(await a.failure(contracts.daoWhitelistingStorage.setWhitelisted(
        randomAddress(),
        true,
        { from: accounts[4] },
      )));
    });
    it('[called by CONTRACT_DAO_WHITELISTING]: set and read', async function () {
      whitelistedAddress = randomAddress();
      assert.ok(await contracts.daoWhitelistingStorage.setWhitelisted.call(
        whitelistedAddress,
        true,
        { from: addressOf.root },
      ));
      await contracts.daoWhitelistingStorage.setWhitelisted(
        whitelistedAddress,
        true,
        { from: addressOf.root },
      );
      assert.deepEqual(await contracts.daoWhitelistingStorage.whitelist.call(whitelistedAddress), true);
      assert.deepEqual(await contracts.daoWhitelistingStorage.whitelist.call(randomAddress()), false);
    });
    it('[update an already whitelisted one to blacklist]', async function () {
      assert.deepEqual(await contracts.daoWhitelistingStorage.whitelist.call(whitelistedAddress), true);
      await contracts.daoWhitelistingStorage.setWhitelisted(
        whitelistedAddress,
        false,
        { from: addressOf.root },
      );
      assert.deepEqual(await contracts.daoWhitelistingStorage.whitelist.call(whitelistedAddress), false);
    });
  });
});
