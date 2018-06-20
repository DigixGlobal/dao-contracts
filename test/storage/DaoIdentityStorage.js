const a = require('awaiting');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  registerInteractive,
} = require('../setup');

const {
  paddedHex,
  randomAddresses,
  getCurrentTimestamp,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoIdentityStorage', function (accounts) {
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
      assert.deepEqual(await contracts.resolver.get_contract.call('storage:dao:identity'), contracts.daoIdentityStorage.address);
    });
  });

  describe('create_role', function () {
    it('[not called by CONTRACT_DAO_IDENTITY]: revert', async function () {
      assert(await a.failure(contracts.daoIdentityStorage.create_role.call(
        bN(2),
        'new_role',
        { from: accounts[1] },
      )));
    });
    it('[create role]: verify read functions', async function () {
      assert.deepEqual(await contracts.daoIdentityStorage.create_role.call(bN(2), 'new_role'), true);
      await contracts.daoIdentityStorage.create_role(bN(2), 'new_role');

      assert.deepEqual(await contracts.daoIdentityStorage.read_role.call(bN(2)), paddedHex(web3, 'new_role'));

      await contracts.daoIdentityStorage.create_role(bN(2), 'new_updated_role');
      assert.deepEqual(await contracts.daoIdentityStorage.read_role.call(bN(2)), paddedHex(web3, 'new_updated_role'));
    });
  });

  describe('create_group', function () {
    it('[not called by CONTRACT_DAO_IDENTITY]: revert', async function () {
      assert(await a.failure(contracts.daoIdentityStorage.create_group.call(
        bN(2),
        'group_for_new_role',
        'sample_doc',
        { from: accounts[2] },
      )));
    });
    it('[create group]: verify read functions', async function () {
      const newGroupRes = await contracts.daoIdentityStorage.create_group.call(
        bN(2),
        'group_for_new_role',
        'sample_doc',
      );
      assert.deepEqual(newGroupRes[0], true);
      await contracts.daoIdentityStorage.create_group(bN(2), 'group_for_new_role', 'sample_doc');

      const group2 = await contracts.daoIdentityStorage.read_group.call(bN(2));
      // group id : 2, group name, doc and members : 0
      assert.deepEqual(group2[0], newGroupRes[1]);
      assert.deepEqual(group2[1], paddedHex(web3, 'group_for_new_role'));
      assert.deepEqual(group2[2], paddedHex(web3, 'sample_doc'));
      assert.deepEqual(group2[3], bN(0));
    });
  });

  describe('update_add_user_to_group', function () {
    it('[not called by CONTRACT_DAO_IDENTITY]: revert', async function () {
      assert(await a.failure(contracts.daoIdentityStorage.update_add_user_to_group.call(
        bN(2),
        addressOf.prl,
        'prl_user_added',
        { from: accounts[3] },
      )));
    });
    it('[add users]: verify read functions', async function () {
      await contracts.daoIdentityStorage.create_role(bN(3), 'role_kycadmin');
      await contracts.daoIdentityStorage.create_group(bN(3), 'group_for_kycadmins', 'another_sample_doc');
      assert.deepEqual(await contracts.daoIdentityStorage.update_add_user_to_group.call(
        bN(2),
        addressOf.prl,
        'prl_user_added',
      ), true);
      await contracts.daoIdentityStorage.update_add_user_to_group(bN(2), addressOf.prl, 'prl_user_added');
      await contracts.daoIdentityStorage.update_add_user_to_group(bN(3), addressOf.kycadmin, 'kycadmin_added');

      // verify read functions
      assert.deepEqual(await contracts.daoIdentityStorage.read_user_role_id.call(addressOf.prl), bN(2));
      assert.deepEqual(await contracts.daoIdentityStorage.read_user_role_id.call(addressOf.kycadmin), bN(3));

      const prlUser = await contracts.daoIdentityStorage.read_user.call(addressOf.prl);
      const kycadminUser = await contracts.daoIdentityStorage.read_user.call(addressOf.kycadmin);
      assert.deepEqual(prlUser[0], bN(2));
      assert.deepEqual(prlUser[1], bN(2));
      assert.deepEqual(prlUser[2], paddedHex(web3, 'prl_user_added'));
      assert.deepEqual(kycadminUser[0], bN(3));
      assert.deepEqual(kycadminUser[1], bN(3));
      assert.deepEqual(kycadminUser[2], paddedHex(web3, 'kycadmin_added'));
    });
  });

  describe('update_remove_group_user', function () {
    it('[not called by CONTRACT_DAO_IDENTITY]: revert', async function () {
      assert(await a.failure(contracts.daoIdentityStorage.update_remove_group_user.call(addressOf.prl, { from: accounts[2] })));
    });
    it('[remove user]: verify read functions', async function () {
      // add dummy users
      const dummyUserAddresses = randomAddresses(2);
      await contracts.daoIdentityStorage.update_add_user_to_group(bN(2), dummyUserAddresses[0], 'dummy_user_1_added');
      await contracts.daoIdentityStorage.update_add_user_to_group(bN(2), dummyUserAddresses[1], 'dummy_user_2_added');

      // make sure there are 3 users in the group 2
      const groupInfoBefore = await contracts.daoIdentityStorage.read_group.call(bN(2));
      assert.deepEqual(groupInfoBefore[3], bN(3));

      // delete addressOf.prlAddress from group
      assert.deepEqual(await contracts.daoIdentityStorage.update_remove_group_user.call(dummyUserAddresses[0]), true);
      await contracts.daoIdentityStorage.update_remove_group_user(dummyUserAddresses[0]);

      // read info of addressOf.prl
      const userInfo = await contracts.daoIdentityStorage.read_user.call(dummyUserAddresses[0]);
      assert.deepEqual(userInfo[0], bN(0)); // no group is 0
      assert.deepEqual(userInfo[1], bN(0)); // no group, hence no role

      // make sure only 2 members in this group now
      const groupInfoAfter = await contracts.daoIdentityStorage.read_group.call(bN(2));
      assert.deepEqual(groupInfoAfter[3], bN(2));
    });
  });

  describe('update_kyc', function () {
    const expiration = bN(getCurrentTimestamp() + 2628000); // 1 month in the future
    it('[not called by CONTRACT_DAO_IDENTITY]: revert', async function () {
      assert(await a.failure(contracts.daoIdentityStorage.update_kyc.call(
        addressOf.prl,
        'doc_for_kyc',
        expiration,
        { from: accounts[4] },
      )));
    });
    it('[update kyc]: verify read functions', async function () {
      await contracts.daoIdentityStorage.update_kyc(addressOf.prl, 'doc_for_kyc', expiration);

      // verify read functions
      const kycInfo = await contracts.daoIdentityStorage.read_kyc_info.call(addressOf.prl);
      assert.deepEqual(kycInfo[0], paddedHex(web3, 'doc_for_kyc'));
      assert.deepEqual(kycInfo[1], expiration);
    });
  });

  describe('is_kyc_approved', function () {
    const oldExpiration = bN(getCurrentTimestamp() - 1); // 1 second in the past
    it('[is valid]', async function () {
      assert.deepEqual(await contracts.daoIdentityStorage.is_kyc_approved.call(addressOf.prl), true);
    });
    it('[update, make invalid]: should return false', async function () {
      await contracts.daoIdentityStorage.update_kyc(addressOf.prl, 'another_doc_for_kyc', oldExpiration);
      const kycInfo = await contracts.daoIdentityStorage.read_kyc_info.call(addressOf.prl);
      assert.deepEqual(kycInfo[0], paddedHex(web3, 'another_doc_for_kyc'));
      assert.deepEqual(kycInfo[1], oldExpiration);
      assert.deepEqual(await contracts.daoIdentityStorage.is_kyc_approved.call(addressOf.prl), false);
    });
  });
});
