const a = require('awaiting');

const MockDgd = artifacts.require('MockDgd.sol');
const MockBadge = artifacts.require('MockBadge.sol');
const MockDgxStorage = artifacts.require('MockDgxStorage.sol');
const MockDgx = artifacts.require('MockDgx.sol');
const MockDgxDemurrageReporter = artifacts.require('MockDgxDemurrageReporter.sol');
const MockNumberCarbonVoting1 = artifacts.require('NumberCarbonVoting1.sol');
const MockNumberCarbonVoting2 = artifacts.require('NumberCarbonVoting2.sol');
const MultiSigWallet = artifacts.require('MultiSigWallet.sol');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  deployServices,
  deployInteractive,
} = require('./setup');

const bN = web3.toBigNumber;

contract('Deployment Test', function (accounts) {
  const libs = {};
  const contracts = {};
  const addressOf = {};
  let multiSigWallet;

  const fundDao = async function (source, value) {
    const balance = await web3.eth.getBalance(contracts.daoFundingManager.address);
    web3.eth.sendTransaction({
      from: source,
      to: contracts.daoFundingManager.address,
      value,
    });
    assert.deepEqual(await web3.eth.getBalance(contracts.daoFundingManager.address), balance.plus(value));
  };

  describe('Deploy', function () {
    it('[Deploy contracts]', async function () {
      await deployLibraries(libs);
      await deployNewContractResolver(contracts);
      await getAccountsAndAddressOf(accounts, addressOf);
      contracts.dgdToken = await MockDgd.new();
      contracts.badgeToken = await MockBadge.new();
      contracts.dgxStorage = await MockDgxStorage.new();
      contracts.dgxToken = await MockDgx.new(contracts.dgxStorage.address, addressOf.feesadmin);
      await contracts.dgxStorage.setInteractive(contracts.dgxToken.address);
      contracts.dgxDemurrageReporter = await MockDgxDemurrageReporter.new(contracts.dgxToken.address);
      contracts.carbonVoting1 = await MockNumberCarbonVoting1.new('carbonVoting1');
      contracts.carbonVoting2 = await MockNumberCarbonVoting2.new('carbonVoting2');
      await deployStorage(libs, contracts, contracts.resolver);
      await deployServices(libs, contracts, contracts.resolver);
      await deployInteractive(libs, contracts, contracts.resolver, addressOf);
    });
    it('[Deploy multiSig]', async function () {
      // 2 out of 3 multisig wallet
      multiSigWallet = await MultiSigWallet.new(addressOf.multiSigUsers, bN(3));
      // fund this multisig with some ethers for gas fees
      await web3.eth.sendTransaction({
        from: accounts[0],
        to: multiSigWallet.address,
        value: web3.toWei(100, 'ether'),
      });

      // only multisig wallet can send funds to DaoFundingManager
      await contracts.daoFundingManager.setFundingSource(multiSigWallet.address, { from: addressOf.root });
    });
    it('[Add users to groups (founders | PRL)]', async function () {
      await contracts.daoIdentity.addGroupUser(bN(2), addressOf.founderBadgeHolder, 'add:founder');
      await contracts.daoIdentity.addGroupUser(bN(3), addressOf.prl, 'add:prl');
    });
    it('[Add multiSig as root]', async function () {
      await contracts.daoIdentity.addGroupUser(bN(1), multiSigWallet.address, 'add:root');
    });
    it('[MultiSig removes original root]', async function () {
      // There will be 2 members in the ROOT group
      const groupInfoBefore = await contracts.daoIdentityStorage.read_group.call(bN(1));
      assert.deepEqual(groupInfoBefore[3], bN(2));

      const { data } = contracts.daoIdentity.removeGroupUser.request(addressOf.root).params[0];
      const txnId = await multiSigWallet.submitTransaction.call(contracts.daoIdentity.address, bN(0), data, { from: addressOf.multiSigUsers[0] });
      const tx = await multiSigWallet.submitTransaction(contracts.daoIdentity.address, bN(0), data, { from: addressOf.multiSigUsers[0] });
      console.log('tx gas used = ', tx.receipt.gasUsed);
      const tx2 = await multiSigWallet.confirmTransaction(txnId, { from: addressOf.multiSigUsers[1] });
      console.log('tx gas used (2) = ', tx2.receipt.gasUsed);
      const tx3 = await multiSigWallet.confirmTransaction(txnId, { from: addressOf.multiSigUsers[2] });
      console.log('tx gas used (3) = ', tx3.receipt.gasUsed);

      // There will be 1 member in the ROOT group (that is the multiSigWallet)
      const groupInfoAfter = await contracts.daoIdentityStorage.read_group.call(bN(1));
      assert.deepEqual(groupInfoAfter[3], bN(1));
      assert.deepEqual(await contracts.daoIdentityStorage.read_user_role_id.call(multiSigWallet.address), bN(1));
    });
    it('[MultiSig adds users to groups (kyc admin)]', async function () {
      const { data } = contracts.daoIdentity.addGroupUser.request(bN(4), addressOf.kycadmin, 'add:kycadmin').params[0];
      const txnId = await multiSigWallet.submitTransaction.call(contracts.daoIdentity.address, bN(0), data, { from: addressOf.multiSigUsers[2] });
      await multiSigWallet.submitTransaction(contracts.daoIdentity.address, bN(0), data, { from: addressOf.multiSigUsers[2] });
      await multiSigWallet.confirmTransaction(txnId, { from: addressOf.multiSigUsers[1] });
      await multiSigWallet.confirmTransaction(txnId, { from: addressOf.multiSigUsers[0] });
      const userInfo = await contracts.daoIdentityStorage.read_user.call(addressOf.kycadmin);
      assert.deepEqual(userInfo[0], bN(4));
      assert.deepEqual(await contracts.daoIdentityStorage.read_user_role_id.call(addressOf.kycadmin), bN(4));

      // multisig can send ethers to DaoFundingManager
      const balanceBefore = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const fundTxnId = await multiSigWallet.submitTransaction.call(contracts.daoFundingManager.address, bN(1e18), '', { from: addressOf.multiSigUsers[2] });
      await multiSigWallet.submitTransaction(contracts.daoFundingManager.address, bN(1e18), '', { from: addressOf.multiSigUsers[2] });
      await multiSigWallet.confirmTransaction(fundTxnId, { from: addressOf.multiSigUsers[1] });
      await multiSigWallet.confirmTransaction(fundTxnId, { from: addressOf.multiSigUsers[0] });
      assert.deepEqual(await web3.eth.getBalance(contracts.daoFundingManager.address), balanceBefore.plus(bN(1e18)));

      // even root cannot send funds
      assert(await a.failure(fundDao(addressOf.root, web3.toWei(1, 'ether'))));
    });
  });
});
