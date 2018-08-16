const a = require('awaiting');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  registerInteractive,
} = require('../setup');

const {
  daoConstantsKeys,
  daoConstantsValues,
} = require('../daoHelpers');

const {
  indexRange,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoConfigsStorage', function (accounts) {
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
      assert.deepEqual(await contracts.resolver.get_contract.call('storage:dao:config'), contracts.daoConfigsStorage.address);
    });
    it('[constructor set values]', async function () {
      for (const k in daoConstantsKeys()) {
        assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys()[k]), daoConstantsValues(bN)[k]);
      }
    });
  });

  describe('updateUintConfigs', function () {
    it('[not called by CONTRACT_DAO_VOTING_CLAIMS]: revert', async function () {
      const oldConfigs = await contracts.daoConfigsStorage.readUintConfigs.call();
      // modify CONFIG_VOTING_COMMIT_PHASE (index 2) TO 12
      oldConfigs[2] = bN(12);
      for (const i of indexRange(1, 20)) {
        assert(await a.failure(contracts.daoConfigsStorage.updateUintConfigs.call(
          oldConfigs,
          { from: accounts[i] },
        )));
      }
    });
    it('[valid call]: should be updated', async function () {
      const oldConfigs = await contracts.daoConfigsStorage.readUintConfigs.call();
      // modify CONFIG_VOTING_COMMIT_PHASE (index 2) TO 12
      // modify CONFIG_BONUS_REPUTATION_NUMERATOR (index 25) TO 7
      oldConfigs[2] = bN(13);
      oldConfigs[25] = bN(7);
      await contracts.daoConfigsStorage.updateUintConfigs(
        oldConfigs,
        { from: accounts[0] },
      );
      const newConfigs = await contracts.daoConfigsStorage.readUintConfigs.call();
      assert.deepEqual(newConfigs[2], bN(13));
      assert.deepEqual(newConfigs[25], bN(7));
    });
  });
});
