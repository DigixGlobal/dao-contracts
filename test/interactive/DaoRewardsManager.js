const a = require('awaiting');

const DaoRewardsManager = artifacts.require('./DaoRewardsManager.sol');

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

contract('DaoRewardsManager', function (accounts) {
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
    contracts.daoRewardsManager = await DaoRewardsManager.new(resolver.address);
    await resolver.register_contract('c:config:controller', addressOf.root);
    await resolver.register_contract('c:dao', addressOf.root);
  });

  describe('updateRewardsBeforeNewQuarter', function () {

  });
});
