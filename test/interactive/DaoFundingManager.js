const a = require('awaiting');

const DaoFundingManager = artifacts.require('./DaoFundingManager.sol');
const DaoIdentity = artifacts.require('./DaoIdentity.sol');
const MockDaoFundingManager = artifacts.require('./MockDaoFundingManager.sol');
const DaoWhitelisting = process.env.SIMULATION ? 0 : artifacts.require('./DaoWhitelisting.sol');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  printDaoDetails,
} = require('../setup');

const {
  randomBytes32,
  indexRange,
  getCurrentTimestamp,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

const doc = randomBytes32();
const fundings = [bN(100 * (10 ** 18)), bN(200), bN(50)];
const finalReward = bN(1 * (10 ** 18));

contract('DaoFundingManager', function (accounts) {
  let libs;
  let contracts;
  let addressOf;

  const kycApproveUser = async (user) => {
    await contracts.daoIdentity.updateKyc(
      user,
      'valid',
      bN(getCurrentTimestamp() + (3600)),
      { from: addressOf.kycadmin },
    );
  };

  const resetBeforeEach = async function () {
    contracts = {};
    libs = {};
    addressOf = {};
    await deployLibraries(libs);
    await deployNewContractResolver(contracts);
    await getAccountsAndAddressOf(accounts, addressOf);
    await deployStorage(libs, contracts, contracts.resolver, addressOf);
    await contracts.daoUpgradeStorage.mock_set_start_of_quarter(getCurrentTimestamp());

    contracts.daoIdentity = await DaoIdentity.new(contracts.resolver.address);
    contracts.daoFundingManager = await DaoFundingManager.new(contracts.resolver.address);

    await DaoWhitelisting.new(contracts.resolver.address, [contracts.daoFundingManager.address]);

    await contracts.daoIdentity.addGroupUser(bN(4), addressOf.kycadmin, '');
    await kycApproveUser(addressOf.dgdHolders[2]);
    await kycApproveUser(addressOf.dgdHolders[3]);

    await contracts.resolver.register_contract('dao:voting:claims', addressOf.root);
    await contracts.resolver.register_contract('dao', addressOf.root);
    await fundDao();
  };

  const fundDao = async function () {
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: contracts.daoFundingManager.address,
      value: web3.toWei(1000, 'ether'),
    });
    assert.deepEqual(await web3.eth.getBalance(contracts.daoFundingManager.address), bN(web3.toWei(1000, 'ether')));
  };

  describe('claimFunding', function () {
    before(async function () {
      await resetBeforeEach();
      // create dummy proposals
      await contracts.daoStorage.addProposal(doc, addressOf.dgdHolders[2], fundings, finalReward, false);
      await contracts.daoStorage.finalizeProposal(doc);
      await contracts.daoStorage.setProposalPass(doc, bN(0), true);
      await contracts.daoStorage.setVotingClaim(doc, bN(0), true);
      await contracts.daoStorage.setProposalCollateralAmount(doc, bN(2e18));
    });
    it('[proposal is not prl approved]: revert', async function () {
      await contracts.daoStorage.updateProposalPRL(doc, bN(2), randomBytes32(), bN(getCurrentTimestamp()));
      const readProposal = await contracts.daoStorage.readProposal.call(doc);
      const isPaused = readProposal[8];
      assert.deepEqual(isPaused, true);
      assert(await a.failure(contracts.daoFundingManager.claimFunding.call(
        doc,
        bN(0),
        fundings[0],
        { from: addressOf.dgdHolders[2] },
      )));
      // unpause again
      await contracts.daoStorage.updateProposalPRL(doc, bN(3), randomBytes32(), bN(getCurrentTimestamp()));
    });
    it('[not called by addressOf.dgdHolders[2]]: revert', async function () {
      const readProposal = await contracts.daoStorage.readProposal.call(doc);
      const isPaused = readProposal[8];
      assert.deepEqual(isPaused, false);
      assert(await a.failure(contracts.daoFundingManager.claimFunding.call(
        doc,
        bN(0),
        fundings[0],
        { from: addressOf.dgdHolders[4] },
      )));
    });
    it('[valid claim]: success | read functions', async function () {
      const ethBalanceProposerBefore = await web3.eth.getBalance(addressOf.dgdHolders[2]);
      const ethBalanceFundingManagerBefore = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const claim = fundings[0];
      const weiInDaoBefore = await web3.eth.getBalance(contracts.daoFundingManager.address);
      await printDaoDetails(bN, contracts);

      const tx = await contracts.daoFundingManager.claimFunding(doc, bN(0), { from: addressOf.dgdHolders[2], gasPrice: web3.toWei(20, 'gwei') });
      const { gasUsed } = tx.receipt;
      const gasPrice = bN(web3.toWei(20, 'gwei'));
      const totalWeiUsed = bN(gasUsed).times(bN(gasPrice));
      const aaa = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const bbb = await web3.eth.getBalance(addressOf.dgdHolders[2]);
      assert.deepEqual(aaa, ethBalanceFundingManagerBefore.minus(claim));
      assert.deepEqual(bbb, ethBalanceProposerBefore.plus(claim).minus(totalWeiUsed));
      const weiInDaoAfter = await web3.eth.getBalance(contracts.daoFundingManager.address);
      assert.deepEqual(weiInDaoBefore, weiInDaoAfter.plus(claim));
    });
    it('[cannot claim funding for milestone after it has already been claimed]', async function () {
      assert(await a.failure(contracts.daoFundingManager.claimFunding(
        doc,
        bN(0),
        { from: addressOf.dgdHolders[2] },
      )));
    });
  });

  describe('refundCollateral', function () {
    it('[not called by CONTRACT_DAO]: revert', async function () {
      assert(await a.failure(contracts.daoFundingManager.refundCollateral(addressOf.dgdHolders[3], doc, { from: accounts[2] })));
    });
    it('[valid call]: success', async function () {
      assert.deepEqual(await contracts.daoFundingManager.refundCollateral.call(addressOf.dgdHolders[3], doc), true);
      const balanceBefore = await web3.eth.getBalance(addressOf.dgdHolders[3]);
      const weiInDaoBefore = await web3.eth.getBalance(contracts.daoFundingManager.address);
      await contracts.daoFundingManager.refundCollateral(addressOf.dgdHolders[3], doc);
      assert.deepEqual(await web3.eth.getBalance(addressOf.dgdHolders[3]), balanceBefore.plus(bN(2 * (10 ** 18))));
      assert.deepEqual(await web3.eth.getBalance(contracts.daoFundingManager.address), weiInDaoBefore.minus(bN(2 * (10 ** 18))));
    });
  });

  describe('moveFundsToNewDao', function () {
    let newDaoFundingManager;
    before(async function () {
      // deploy another funding manager for, say, DAO 2.0
      newDaoFundingManager = await MockDaoFundingManager.new();
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
      const balanceNowOld = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const balanceNowNew = await web3.eth.getBalance(newDaoFundingManager.address);
      assert.deepEqual(balanceNowOld, bN(0));
      assert.deepEqual(balanceNowNew, balanceInitialOld);
    });
    it('[can receive ether from other people also]', async function () {
      const balanceBefore = await web3.eth.getBalance(newDaoFundingManager.address);
      const sentValue = web3.toWei(40, 'ether');
      await web3.eth.sendTransaction({ from: addressOf.root, to: newDaoFundingManager.address, value: sentValue });
      assert.deepEqual(await web3.eth.getBalance(newDaoFundingManager.address), balanceBefore.plus(sentValue));
    });
  });
});
