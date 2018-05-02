const a = require('awaiting');

const ContractResolver = artifacts.require('./ContractResolver.sol');
const DoublyLinkedList = artifacts.require('./DoublyLinkedList.sol');

const IdentityStorage = artifacts.require('./IdentityStorage.sol');
const DaoConfigsStorage = artifacts.require('./DaoConfigsStorage.sol');
const DaoStakeStorage = artifacts.require('./DaoStakeStorage.sol');
const DaoStorage = artifacts.require('./DaoStorage.sol');

const DaoIdentity = artifacts.require('./DaoIdentity.sol');
const Dao = artifacts.require('./Dao.sol');

const deployLibraries = async function () {
  const libs = {};
  libs.doublyLinkedList = await DoublyLinkedList.new();
  return libs;
};

const deployNewContractResolver = async function () {
  return ContractResolver.new();
};

const getAccountsAndAddressOf = async function (accounts) {
  const addressOf = {
    root: accounts[0],
    prl: accounts[1],
    kycadmin: accounts[2],
    founderBadgeHolder: accounts[3],
    badgeHolder1: accounts[4],
    badgeHolder2: accounts[5],
    dgdHolder1: accounts[6],
    dgdHolder2: accounts[7],
    dgdHolder3: accounts[8],
    dgdHolder4: accounts[9]
  };
  return addressOf;
};

const deployStorage = async function (libs, contracts, resolver, addressOf) {
  IdentityStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.identityStorage = await IdentityStorage.new(resolver.address);
  contracts.daoConfigsStorage = await DaoConfigsStorage.new(resolver.address);
  DaoStakeStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.daoStakeStorage = await DaoStakeStorage.new(resolver.address);
  DaoStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.daoStorage = await DaoStorage.new(resolver.address);
};

const registerInteractive = async function (resolver, addressOf) {
  const callingKeys = [
    'c:dao:identity',
    'c:stake:locking',
    'c:dao',
  ];
  await a.map(callingKeys, 10, key => resolver.register_contract(key, addressOf.root));
};

const deployIdentity = async function (libs, contracts, resolver, addressOf) {
  IdentityStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.identityStorage = await IdentityStorage.new(resolver.address);
  contracts.daoIdentity = await DaoIdentity.new(resolver.address);
};

const deployConfigsAndStake = async function (libs, contracts, resolver, addressOf) {
  contracts.configsStorage = await ConfigsStorage.new(resolver.address);
  contracts.stakeStorage = await StakeStorage.new(resolver.address);
};

const deployDao = async function (libs, contracts, resolver, addressOf) {
  DaoStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.daoStorage = await DaoStorage.new(resolver.address);
  contracts.dao = await Dao.new(resolver.address);
}

module.exports = {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployIdentity,
  deployConfigsAndStake,
  deployDao,
  deployStorage,
  registerInteractive
};
