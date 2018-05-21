const a = require('awaiting');

const DaoFundingManager = artifacts.require('./DaoFundingManager.sol');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  deployServices,
  deployInteractive,
} = require('../setup');

const {
  randomAddress,
  randomBytes32,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

const doc = randomBytes32();
const durations = [bN(35), bN(45), bN(55)];
const fundings = [bN(100 * (10 ** 18)), bN(200), bN(50)];

contract('DaoFundingManager', function (accounts) {
  let libs;
  let resolver;
  let contracts;
  let addressOf;
  let proposer;

  before(async function () {
    libs = await deployLibraries();
    resolver = await deployNewContractResolver();
    addressOf = await getAccountsAndAddressOf(accounts);
    proposer = addressOf.dgdHolder3;
    contracts = {};
    await deployStorage(libs, contracts, resolver, addressOf);
    await deployServices(libs, contracts, resolver, addressOf);
    contracts.daoFundingManager = await DaoFundingManager.new(resolver.address);
    await resolver.register_contract('c:config:controller', addressOf.root);
    await resolver.register_contract('c:dao', addressOf.root);
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
          proposer,
          fundings[0],
          { from: accounts[i] },
        )));
      }
    });
    it('[valid call]: success | read functions', async function () {
      assert.ok(await contracts.daoFundingManager.allocateEth.call(
        proposer,
        fundings[0],
      ));
      await contracts.daoFundingManager.allocateEth(proposer, fundings[0]);
      assert.deepEqual(await contracts.daoFundingStorage.readClaimableEth.call(proposer), fundings[0]);
    });
  });

  describe('claimEthFunding', function () {
    before(async function () {
      // create dummy proposals
      await contracts.daoStorage.addProposal(doc, proposer, durations, fundings);
    });
    it('[proposal is not prl approved]: revert', async function () {
      assert.deepEqual(await contracts.daoStorage.readProposalPRL.call(doc), false);
      assert(await a.failure(contracts.daoFundingManager.claimEthFunding.call(
        doc,
        { from: proposer },
      )));
    });
    it('[not called by proposer]: revert', async function () {
      // approve prl
      await contracts.daoStorage.updateProposalPRL(doc, true);
      assert.deepEqual(await contracts.daoStorage.readProposalPRL.call(doc), true);
      assert(await a.failure(contracts.daoFundingManager.claimEthFunding.call(
        doc,
        { from: randomAddress() },
      )));
    });
    it('[valid claim]: success | read functions', async function () {
      const ethBalanceProposerBefore = await web3.eth.getBalance(proposer);
      const ethBalanceFundingManagerBefore = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const claim = await contracts.daoFundingStorage.readClaimableEth.call(proposer);
      const tx = await contracts.daoFundingManager.claimEthFunding(doc, { from: proposer, gasPrice: web3.toWei(20, 'gwei') });
      const gasUsed = tx.receipt.gasUsed;
      const gasPrice = bN(web3.toWei(20, 'gwei'));
      const totalWeiUsed = bN(gasUsed).times(bN(gasPrice));
      const aaa = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const bbb = await web3.eth.getBalance(proposer);
      assert.deepEqual(await contracts.daoFundingStorage.readClaimableEth.call(proposer), bN(0));
      assert.deepEqual(aaa, ethBalanceFundingManagerBefore.minus(claim));
      assert.deepEqual(bbb, ethBalanceProposerBefore.plus(claim).minus(totalWeiUsed));
    });
  });

  // TODO
  describe('moveFundsToNewDao', function () {

  });
});
