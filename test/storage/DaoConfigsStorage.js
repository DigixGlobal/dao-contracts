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
  randomBigNumbers,
  randomBytes32s,
  randomAddresses,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

const dummyConfigNames = randomBytes32s(9);
const dummyConfigUints = randomBigNumbers(bN, 3);
const dummyConfigBytes = randomBytes32s(3);
const dummyConfigAddresses = randomAddresses(3);

contract('DaoConfigsStorage', function (accounts) {
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
      assert.deepEqual(await resolver.get_contract.call('s:dao:config'), contracts.daoConfigsStorage.address);
    });
    it('[constructor set values]', async function () {
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION), daoConstantsValues(bN).CONFIG_LOCKING_PHASE_DURATION);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_QUARTER_DURATION), daoConstantsValues(bN).CONFIG_QUARTER_DURATION);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_VOTING_COMMIT_PHASE), daoConstantsValues(bN).CONFIG_VOTING_COMMIT_PHASE);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_VOTING_PHASE_TOTAL), daoConstantsValues(bN).CONFIG_VOTING_PHASE_TOTAL);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_INTERIM_COMMIT_PHASE), daoConstantsValues(bN).CONFIG_INTERIM_COMMIT_PHASE);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL), daoConstantsValues(bN).CONFIG_INTERIM_PHASE_TOTAL);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_QUORUM_FIXED_PORTION_NUMERATOR), daoConstantsValues(bN).CONFIG_QUORUM_FIXED_PORTION_NUMERATOR);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_QUORUM_FIXED_PORTION_DENOMINATOR), daoConstantsValues(bN).CONFIG_QUORUM_FIXED_PORTION_DENOMINATOR);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_QUORUM_SCALING_FACTOR_NUMERATOR), daoConstantsValues(bN).CONFIG_QUORUM_SCALING_FACTOR_NUMERATOR);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_QUORUM_SCALING_FACTOR_DENOMINATOR), daoConstantsValues(bN).CONFIG_QUORUM_SCALING_FACTOR_DENOMINATOR);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_DRAFT_QUOTA_NUMERATOR), daoConstantsValues(bN).CONFIG_DRAFT_QUOTA_NUMERATOR);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_DRAFT_QUOTA_DENOMINATOR), daoConstantsValues(bN).CONFIG_DRAFT_QUOTA_DENOMINATOR);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_VOTING_QUOTA_NUMERATOR), daoConstantsValues(bN).CONFIG_VOTING_QUOTA_NUMERATOR);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(daoConstantsKeys().CONFIG_VOTING_QUOTA_DENOMINATOR), daoConstantsValues(bN).CONFIG_VOTING_QUOTA_DENOMINATOR);
    });
  });

  describe('set_uint_config', function () {
    it('[not called by CONTRACT_CONFIG_CONTROLLER]: revert', async function () {
      assert(await a.failure(contracts.daoConfigsStorage.set_uint_config.call(
        dummyConfigNames[0],
        dummyConfigUints[0],
        { from: accounts[2] },
      )));
    });
    it('[add new uint config]: verify public variable', async function () {
      await contracts.daoConfigsStorage.set_uint_config(dummyConfigNames[0], dummyConfigUints[0]);
      await contracts.daoConfigsStorage.set_uint_config(dummyConfigNames[1], dummyConfigUints[1]);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(dummyConfigNames[0]), dummyConfigUints[0]);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(dummyConfigNames[1]), dummyConfigUints[1]);
    });
    it('[update uint config]: verify public variable', async function () {
      await contracts.daoConfigsStorage.set_uint_config(dummyConfigNames[0], dummyConfigUints[2]);
      assert.deepEqual(await contracts.daoConfigsStorage.uintConfigs(dummyConfigNames[0]), dummyConfigUints[2]);
    });
  });

  describe('set_bytes_config', function () {
    it('[not called by CONTRACT_CONFIG_CONTROLLER]: revert', async function () {
      assert(await a.failure(contracts.daoConfigsStorage.set_bytes_config.call(
        dummyConfigNames[3],
        dummyConfigBytes[0],
        { from: accounts[3] },
      )));
    });
    it('[add new bytes config]: verify public variable', async function () {
      await contracts.daoConfigsStorage.set_bytes_config(dummyConfigNames[3], dummyConfigBytes[0]);
      await contracts.daoConfigsStorage.set_bytes_config(dummyConfigNames[4], dummyConfigBytes[1]);
      assert.deepEqual(await contracts.daoConfigsStorage.bytesConfigs(dummyConfigNames[3]), dummyConfigBytes[0]);
      assert.deepEqual(await contracts.daoConfigsStorage.bytesConfigs(dummyConfigNames[4]), dummyConfigBytes[1]);
    });
    it('[update bytes config]: verify public variable', async function () {
      await contracts.daoConfigsStorage.set_bytes_config(dummyConfigNames[3], dummyConfigBytes[2]);
      assert.deepEqual(await contracts.daoConfigsStorage.bytesConfigs(dummyConfigNames[3]), dummyConfigBytes[2]);
    });
  });

  describe('set_address_config', function () {
    it('[not called by CONTRACT_CONFIG_CONTROLLER]: revert', async function () {
      assert(await a.failure(contracts.daoConfigsStorage.set_address_config.call(
        dummyConfigNames[6],
        dummyConfigAddresses[0],
        { from: accounts[4] },
      )));
    });
    it('[add new address config]: verify public variable', async function () {
      await contracts.daoConfigsStorage.set_address_config(dummyConfigNames[6], dummyConfigAddresses[0]);
      await contracts.daoConfigsStorage.set_address_config(dummyConfigNames[7], dummyConfigAddresses[1]);
      assert.deepEqual(await contracts.daoConfigsStorage.addressConfigs(dummyConfigNames[6]), dummyConfigAddresses[0]);
      assert.deepEqual(await contracts.daoConfigsStorage.addressConfigs(dummyConfigNames[7]), dummyConfigAddresses[1]);
    });
    it('[update address config]: verify public variable', async function () {
      await contracts.daoConfigsStorage.set_address_config(dummyConfigNames[6], dummyConfigAddresses[2]);
      assert.deepEqual(await contracts.daoConfigsStorage.addressConfigs(dummyConfigNames[6]), dummyConfigAddresses[2]);
    });
  });
});
