const a = require('awaiting');

const {
  indexRange,
} = require('@digix/helpers/lib/helpers');

const ContractResolver = artifacts.require('./ContractResolver.sol');
const DoublyLinkedList = artifacts.require('./DoublyLinkedList.sol');

const IdentityStorage = artifacts.require('./IdentityStorage.sol');
const DaoConfigsStorage = artifacts.require('./DaoConfigsStorage.sol');
const DaoStakeStorage = artifacts.require('./DaoStakeStorage.sol');
const DaoPointsStorage = artifacts.require('./DaoPointsStorage.sol');
const DaoStorage = artifacts.require('./DaoStorage.sol');

const DaoInfoService = artifacts.require('./DaoInfoService.sol');
const DaoListingService = artifacts.require('./DaoListingService.sol');
const DaoCalculatorService = artifacts.require('./DaoCalculatorService.sol');

const DaoIdentity = artifacts.require('./DaoIdentity.sol');
const Dao = artifacts.require('./Dao.sol');
const DaoStakeLocking = artifacts.require('./DaoStakeLocking.sol');

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
    badgeHolder3: accounts[6],
    badgeHolder4: accounts[7],
    dgdHolder1: accounts[8],
    dgdHolder2: accounts[9],
    dgdHolder3: accounts[10],
    dgdHolder4: accounts[11],
    dgdHolder5: accounts[12],
    dgdHolder6: accounts[13]
  };
  return addressOf;
};

const getAllParticipantAddresses = function (accounts) {
  let addresses = [];
  for (const i of indexRange(3, 14)) {
    addresses.push(accounts[i]);
  }
  return addresses;
}

const deployStorage = async function (libs, contracts, resolver, addressOf) {
  IdentityStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.identityStorage = await IdentityStorage.new(resolver.address);
  contracts.daoConfigsStorage = await DaoConfigsStorage.new(resolver.address);
  DaoStakeStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.daoStakeStorage = await DaoStakeStorage.new(resolver.address);
  contracts.daoPointsStorage = await DaoPointsStorage.new(resolver.address);
  DaoStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.daoStorage = await DaoStorage.new(resolver.address);
};

const registerInteractive = async function (resolver, addressOf) {
  const callingKeys = [
    'c:dao:identity',
    'c:stake:locking',
    'c:dao',
    'c:config:controller',
    'i:quarter:point',
    'i:reputation:point',
  ];
  await a.map(callingKeys, 10, key => resolver.register_contract(key, addressOf.root));
};

const deployServices = async function (libs, contracts, resolver, addressOf) {
  contracts.daoInfoService = await DaoInfoService.new(resolver.address);
  contracts.daoListingService = await DaoListingService.new(resolver.address);
  contracts.daoCalculatorService = await DaoCalculatorService.new(resolver.address);
};

const deployInteractive = async function (libs, contracts, resolver, addressOf) {
  contracts.daoStakeLocking = await DaoStakeLocking.new(resolver.address);
};

module.exports = {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  getAllParticipantAddresses,
  deployStorage,
  registerInteractive,
  deployServices,
  deployInteractive
};
