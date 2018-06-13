const a = require('awaiting');

const DaoIdentity = artifacts.require('./DaoIdentity.sol');

const {
  deployNewContractResolver,
  deployLibraries,
  deployStorage,
  getAccountsAndAddressOf,
} = require('./../setup');

const {
  paddedHex,
  indexRange,
  randomAddress,
  randomBigNumber,
  getCurrentTimestamp,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoIdentity', function (accounts) {
  let libs;
  let contracts;
  let addressOf;

  before(async function () {
    libs = {};
    contracts = {};
    addressOf = {};
    await deployLibraries(libs);
    await deployNewContractResolver(contracts);
    await getAccountsAndAddressOf(accounts, addressOf);
    await deployStorage(libs, contracts, contracts.resolver, addressOf);
    contracts.daoIdentity = await DaoIdentity.new(contracts.resolver.address);
  });

  describe('initialization', function () {
    it('[verify key]', async function () {
      assert.deepEqual(await contracts.resolver.get_contract('dao:identity'), contracts.daoIdentity.address);
    });
    it('[verify constructor set values]', async function () {
      assert.deepEqual(await contracts.daoIdentityStorage.read_role.call(bN(2)), paddedHex(web3, 'founders'));
      assert.deepEqual(await contracts.daoIdentityStorage.read_role.call(bN(3)), paddedHex(web3, 'prls'));
      assert.deepEqual(await contracts.daoIdentityStorage.read_role.call(bN(4)), paddedHex(web3, 'kycadmins'));
      const group2 = await contracts.daoIdentityStorage.read_group.call(bN(2));
      const group3 = await contracts.daoIdentityStorage.read_group.call(bN(3));
      const group4 = await contracts.daoIdentityStorage.read_group.call(bN(4));
      assert.deepEqual(group2[1], paddedHex(web3, 'founders_group'));
      assert.deepEqual(group3[1], paddedHex(web3, 'prls_group'));
      assert.deepEqual(group4[1], paddedHex(web3, 'kycadmins_group'));
    });
  });

  describe('addGroupUser', function () {
    it('[non-root tries to add group user]: revert', async function () {
      for (const i of indexRange(1, 20)) {
        assert(await a.failure(contracts.daoIdentity.addGroupUser.call(
          bN(2),
          randomAddress(),
          '',
          { from: accounts[i] },
        )));
      }
    });
    it('[root tries to add group user]: success | verify storage layer', async function () {
      const randomUser = randomAddress();
      const readGroupBefore = await contracts.daoIdentityStorage.read_group.call(bN(2));
      assert.ok(await contracts.daoIdentity.addGroupUser.call(
        bN(2),
        randomUser,
        'added to founders',
        { from: addressOf.root },
      ));
      await contracts.daoIdentity.addGroupUser(bN(2), randomUser, 'added to founders', { from: addressOf.root });
      const readGroupAfter = await contracts.daoIdentityStorage.read_group.call(bN(2));
      assert.deepEqual(readGroupAfter[3], readGroupBefore[3].plus(bN(1)));
      const readUser = await contracts.daoIdentityStorage.read_user.call(randomUser);
      assert.deepEqual(readUser[0], bN(2));
      assert.deepEqual(readUser[1], bN(2));
      assert.deepEqual(readUser[2], paddedHex(web3, 'added to founders'));
    });
  });

  describe('removeGroupUser', function () {
    const randomUser1 = randomAddress();
    const randomUser2 = randomAddress();
    before(async function () {
      await contracts.daoIdentity.addGroupUser(bN(3), randomUser1, 'added to prls', { from: addressOf.root });
      await contracts.daoIdentity.addGroupUser(bN(2), randomUser2, 'added to founders', { from: addressOf.root });
    });
    it('[non-root tries to remove group user]: revert', async function () {
      for (const i of indexRange(1, 20)) {
        assert(await a.failure(contracts.daoIdentity.removeGroupUser.call(
          randomUser1,
          { from: accounts[i] },
        )));
        assert(await a.failure(contracts.daoIdentity.removeGroupUser.call(
          randomUser2,
          { from: accounts[i] },
        )));
      }
    });
    it('[root removes group user]: success | verify storage layer', async function () {
      await contracts.daoIdentity.removeGroupUser(randomUser1);
      await contracts.daoIdentity.removeGroupUser(randomUser2);
      const readUser1 = await contracts.daoIdentityStorage.read_user.call(randomUser1);
      const readUser2 = await contracts.daoIdentityStorage.read_user.call(randomUser2);
      assert.deepEqual(readUser1[0], bN(0));
      assert.deepEqual(readUser1[1], bN(0));
      assert.deepEqual(readUser2[0], bN(0));
      assert.deepEqual(readUser2[1], bN(0));
    });
  });

  describe('updateKyc', function () {
    const randomUser1 = randomAddress();
    const randomUser2 = randomAddress();
    const expiry1 = bN(getCurrentTimestamp()).plus(bN(1000));
    const expiry2 = randomBigNumber(bN, bN(getCurrentTimestamp()));
    before(async function () {
      await contracts.daoIdentity.addGroupUser(bN(4), addressOf.kycadmin, 'kyc admin added');
    });
    it('[called by non-kycadmin]: revert', async function () {
      for (let i = 0; i < 20; i++) {
        if (accounts[i] === addressOf.kycadmin) i++;
        assert(await a.failure(contracts.daoIdentity.updateKyc.call(
          randomUser1,
          '',
          expiry1,
          { from: accounts[i] },
        )));
        assert(await a.failure(contracts.daoIdentity.removeGroupUser.call(
          randomUser2,
          '',
          expiry2,
          { from: accounts[i] },
        )));
      }
    });
    it('[called by kycadmin]: success | verify storage layer', async function () {
      await contracts.daoIdentity.updateKyc(randomUser1, 'doc 1', expiry1, { from: addressOf.kycadmin });
      await contracts.daoIdentity.updateKyc(randomUser2, 'doc 2', expiry2, { from: addressOf.kycadmin });
      assert.deepEqual(await contracts.daoIdentityStorage.is_kyc_approved.call(randomUser1), true);
      assert.deepEqual(await contracts.daoIdentityStorage.is_kyc_approved.call(randomUser2), false);
      const user1 = await contracts.daoIdentityStorage.read_kyc_info.call(randomUser1);
      const user2 = await contracts.daoIdentityStorage.read_kyc_info.call(randomUser2);
      assert.deepEqual(user1[0], paddedHex(web3, 'doc 1'));
      assert.deepEqual(user2[0], paddedHex(web3, 'doc 2'));
      assert.deepEqual(user1[1], expiry1);
      assert.deepEqual(user2[1], expiry2);
    });
  });
});
