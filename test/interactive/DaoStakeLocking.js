const a = require('awaiting');

const MockDGD = artifacts.require('./MockDGD.sol');
const MockBadge = artifacts.require('./MockBadge.sol');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  deployServices,
  deployInteractive,
} = require('../setup');

const {
  sampleBadgeWeights,
  sampleStakeWeights,
  configs,
} = require('../daoHelpers');

const {
  randomBigNumber,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoStakeLocking', function (accounts) {
  let libs;
  let resolver;
  let contracts;
  let addressOf;

  before(async function () {
    libs = await deployLibraries();
    resolver = await deployNewContractResolver();
    addressOf = await getAccountsAndAddressOf(accounts);
    contracts = {};
    await deployStorage(libs, contracts, resolver, addressOf);
    await deployServices(libs, contracts, resolver, addressOf);
    await deployInteractive(libs, contracts, resolver, addressOf);
    contracts.dgdToken = await MockDGD.at(process.env.DGD_ADDRESS);
    contracts.badgeToken = await MockBadge.at(process.env.DGD_BADGE_ADDRESS);
    if (process.env.FIRST_TEST) {
      await initialTransferTokens();
    }
  });

  const initialTransferTokens = async function () {
    await contracts.dgdToken.transfer(addressOf.dgdHolder1, sampleStakeWeights(bN).dgdHolder1);
    await contracts.dgdToken.transfer(addressOf.dgdHolder2, sampleStakeWeights(bN).dgdHolder2);
    await contracts.dgdToken.transfer(addressOf.dgdHolder3, sampleStakeWeights(bN).dgdHolder3);
    await contracts.dgdToken.transfer(addressOf.dgdHolder4, sampleStakeWeights(bN).dgdHolder4);
    await contracts.dgdToken.transfer(addressOf.dgdHolder5, sampleStakeWeights(bN).dgdHolder5);
    await contracts.dgdToken.transfer(addressOf.dgdHolder6, sampleStakeWeights(bN).dgdHolder6);
    await contracts.dgdToken.transfer(addressOf.badgeHolder1, sampleStakeWeights(bN).badgeHolder1);
    await contracts.dgdToken.transfer(addressOf.badgeHolder2, sampleStakeWeights(bN).badgeHolder2);
    await contracts.dgdToken.transfer(addressOf.badgeHolder3, sampleStakeWeights(bN).badgeHolder3);
    await contracts.dgdToken.transfer(addressOf.badgeHolder4, sampleStakeWeights(bN).badgeHolder4);

    await contracts.badgeToken.transfer(addressOf.badgeHolder1, sampleBadgeWeights(bN).badgeHolder1);
    await contracts.badgeToken.transfer(addressOf.badgeHolder2, sampleBadgeWeights(bN).badgeHolder2);
    await contracts.badgeToken.transfer(addressOf.badgeHolder3, sampleBadgeWeights(bN).badgeHolder3);
    await contracts.badgeToken.transfer(addressOf.badgeHolder4, sampleBadgeWeights(bN).badgeHolder4);

    assert.deepEqual(await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder3), sampleStakeWeights(bN).dgdHolder3);
    assert.deepEqual(await contracts.badgeToken.balanceOf.call(addressOf.badgeHolder2), sampleBadgeWeights(bN).badgeHolder2);
  };

  describe('lockDGD', function () {
    it('[amount = 0]: revert', async function () {
      assert(await a.failure(contracts.daoStakeLocking.lockDGD.call(
        bN(0),
        { from: addressOf.dgdHolder1 },
      )));
    });
    it('[sender has not approved DaoStakeLocking contract to transferFrom tokens]: transferFrom fails, revert', async function () {
      const balance = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder1);
      const amount = randomBigNumber(bN, balance);
      assert(await a.failure(contracts.daoStakeLocking.lockDGD.call(
        amount,
        { from: addressOf.dgdHolder1 },
      )));
    });
    it('[amount less than CONFIG_MINIMUM_LOCKED_DGD is locked]: locked but not participant', async function () {
      const balance = await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder1);
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, balance, { from: addressOf.dgdHolder1 });
      const amount = randomBigNumber(bN, configs(bN).CONFIG_MINIMUM_LOCKED_DGD);
      assert.deepEqual(await contracts.daoStakeLocking.lockDGD.call(
        amount,
        { from: addressOf.dgdHolder1 },
      ), true);
    });
  });

  describe('lockBadge', function () {

  });

  describe('withdrawDGD', function () {

  });

  describe('withdrawBadge', function () {

  })
});
