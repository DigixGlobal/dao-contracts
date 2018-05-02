const DaoStorage = artifacts.require('DaoStorage.sol');

// const {
//
// } = require('@digix/helpers/lib/helpers');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  registerInteractive,
} = require('../setup');

const bN = web3.toBigNumber;

const callingKeys = [
  'c:dao',
];

contract('DaoStorage', function (accounts) {
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

  describe('addProposal', function () {
    it('add new proposal', async function () {

    });
  });

  describe('editProposal', function () {

  });

  describe('updateProposalEndorse', function () {

  });
});
