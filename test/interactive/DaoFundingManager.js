const a = require('awaiting');

const DaoFundingManager = artifacts.require('./DaoFundingManager.sol');
const MockDaoFundingManager = artifacts.require('./MockDaoFundingManager.sol');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
} = require('../setup');

const {
  randomAddress,
  randomBytes32,
  indexRange,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

const doc = randomBytes32();
const durations = [bN(35), bN(45), bN(55)];
const fundings = [bN(100 * (10 ** 18)), bN(200), bN(50)];
const finalReward = bN(1 * (10 ** 18));

contract('DaoFundingManager', function (accounts) {
  let libs;
  let contracts;
  let addressOf;

  before(async function () {
    contracts = {};
    libs = {};
    addressOf = {};
    await deployLibraries(libs);
    await deployNewContractResolver(contracts);
    await getAccountsAndAddressOf(accounts, addressOf);
    await deployStorage(libs, contracts, contracts.resolver, addressOf);
    contracts.daoFundingManager = await DaoFundingManager.new(contracts.resolver.address);
    await contracts.resolver.register_contract('dao:voting:claims', addressOf.root);
    await contracts.resolver.register_contract('c:dao', addressOf.root);
    await fundDao();
  });

  const fundDao = async function () {
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: contracts.daoFundingManager.address,
      value: web3.toWei(1000, 'ether'),
    });
    assert.deepEqual(await contracts.daoFundingStorage.ethInDao.call(), bN(web3.toWei(1000, 'ether')));
  };

  describe('allocateEth', function () {
    it('[not called from CONTRACT_DAO]: revert', async function () {
      for (let i = 1; i < 20; i++) {
        assert(await a.failure(contracts.daoFundingManager.allocateEth.call(
          addressOf.dgdHolders[2],
          fundings[0],
          { from: accounts[i] },
        )));
      }
    });
    it('[valid call]: success | read functions', async function () {
      assert.ok(await contracts.daoFundingManager.allocateEth.call(
        addressOf.dgdHolders[2],
        fundings[0],
      ));
      await contracts.daoFundingManager.allocateEth(addressOf.dgdHolders[2], fundings[0]);
      assert.deepEqual(await contracts.daoFundingStorage.claimableEth.call(addressOf.dgdHolders[2]), fundings[0]);

      await contracts.daoFundingManager.allocateEth(addressOf.dgdHolders[2], bN(20));
      assert.deepEqual(await contracts.daoFundingStorage.claimableEth.call(addressOf.dgdHolders[2]), fundings[0].plus(bN(20)));
    });
  });

  describe('claimEthFunding', function () {
    before(async function () {
      // create dummy proposals
      await contracts.daoStorage.addProposal(doc, addressOf.dgdHolders[2], durations, fundings, finalReward);
      await contracts.daoStorage.finalizeProposal(doc);
    });
    it('[proposal is not prl approved]: revert', async function () {
      assert.deepEqual(await contracts.daoStorage.readProposalPRL.call(doc, bN(0)), false);
      assert(await a.failure(contracts.daoFundingManager.claimEthFunding.call(
        doc,
        bN(0),
        fundings[0],
        { from: addressOf.dgdHolders[2] },
      )));
    });
    it('[not called by addressOf.dgdHolders[2]]: revert', async function () {
      // approve prl
      await contracts.daoStorage.updateProposalPRL(doc, bN(0), true);
      assert.deepEqual(await contracts.daoStorage.readProposalPRL.call(doc, bN(0)), true);
      assert(await a.failure(contracts.daoFundingManager.claimEthFunding.call(
        doc,
        bN(0),
        fundings[0],
        { from: addressOf.dgdHolders[4] },
      )));
    });
    it('[cannot withdraw more than the funding for milestone, even if claimable eth is more for that address]', async function () {
      const claimable = await contracts.daoFundingStorage.claimableEth.call(addressOf.dgdHolders[2]);
      assert(await a.failure(contracts.daoFundingManager.claimEthFunding.call(
        doc,
        bN(0),
        claimable,
        { from: addressOf.dgdHolders[2] },
      )));
    });
    it('[valid claim]: success | read functions', async function () {
      const ethBalanceProposerBefore = await web3.eth.getBalance(addressOf.dgdHolders[2]);
      const ethBalanceFundingManagerBefore = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const claimable = await contracts.daoFundingStorage.claimableEth.call(addressOf.dgdHolders[2]);
      const claim = fundings[0];
      const ethInDaoBefore = await contracts.daoFundingStorage.ethInDao.call();
      const tx = await contracts.daoFundingManager.claimEthFunding(doc, bN(0), claim, { from: addressOf.dgdHolders[2], gasPrice: web3.toWei(20, 'gwei') });
      const { gasUsed } = tx.receipt;
      const gasPrice = bN(web3.toWei(20, 'gwei'));
      const totalWeiUsed = bN(gasUsed).times(bN(gasPrice));
      const aaa = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const bbb = await web3.eth.getBalance(addressOf.dgdHolders[2]);
      assert.deepEqual(await contracts.daoFundingStorage.claimableEth.call(addressOf.dgdHolders[2]), claimable.minus(claim));
      assert.deepEqual(aaa, ethBalanceFundingManagerBefore.minus(claim));
      assert.deepEqual(bbb, ethBalanceProposerBefore.plus(claim).minus(totalWeiUsed));
      const ethInDaoAfter = await contracts.daoFundingStorage.ethInDao.call();
      assert.deepEqual(ethInDaoBefore, ethInDaoAfter.plus(claim));
    });
  });

  describe('moveFundsToNewDao', function () {
    let newDaoFundingManager;
    before(async function () {
      // deploy another funding manager for, say, DAO 2.0
      newDaoFundingManager = await MockDaoFundingManager.new(contracts.daoFundingManager.address);
    });
    it('[not called by CONTRACT_DAO]: revert', async function () {
      for (const i of indexRange(1, 20)) {
        assert(await a.failure(contracts.daoFundingManager.moveFundsToNewDao.call(
          newDaoFundingManager.address,
          { from: accounts[i] },
        )));
      }
    });
    it('[valid call]: check balances', async function () {
      const balanceInitialOld = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const balanceInitialNew = await web3.eth.getBalance(newDaoFundingManager.address);
      assert.deepEqual(balanceInitialNew, bN(0));
      await contracts.daoFundingManager.moveFundsToNewDao(newDaoFundingManager.address, { from: addressOf.root });
      await newDaoFundingManager.updateEthInDao();
      const balanceNowOld = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const balanceNowNew = await web3.eth.getBalance(newDaoFundingManager.address);
      assert.deepEqual(await contracts.daoFundingStorage.ethInDao.call(), bN(0));
      assert.deepEqual(await newDaoFundingManager.ethInDao.call(), balanceNowNew);
      assert.deepEqual(balanceNowOld, bN(0));
      assert.deepEqual(balanceNowNew, balanceInitialOld);
    });
    it('[can receive ether from other people also]', async function () {
      const balanceBefore = await web3.eth.getBalance(newDaoFundingManager.address);
      const sentValue = web3.toWei(40, 'ether');
      await newDaoFundingManager.manuallyFundDao({ from: addressOf.root, value: sentValue });
      assert.deepEqual(await newDaoFundingManager.ethInDao.call(), balanceBefore.plus(sentValue));
    });
  });
});
