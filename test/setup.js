const a = require('awaiting');

// const contract = require('truffle-contract');

const {
  indexRange,
  randomBytes32,
} = require('@digix/helpers/lib/helpers');

const {
  sampleStakeWeights,
  sampleBadgeWeights,
} = require('./daoHelpers');

// const ContractResolverJson = require('./../build/contracts/ContractResolver.json');
// const DoublyLinkedListJson = require('./../build/contracts/DoublyLinkedList.json');
//
// const IdentityStorageJson = require('./../build/contracts/IdentityStorage.json');
// const DaoConfigsStorageJson = require('./../build/contracts/MockDaoConfigsStorage.json');
// const DaoStakeStorageJson = require('./../build/contracts/DaoStakeStorage.json');
// const DaoPointsStorageJson = require('./../build/contracts/DaoPointsStorage.json');
// const DaoStorageJson = require('./../build/contracts/DaoStorage.json');
// const DaoSpecialStorageJson = require('./../build/contracts/DaoSpecialStorage.json');
// const DaoFundingStorageJson = require('./../build/contracts/DaoFundingStorage.json');
// const DaoRewardsStorageJson = require('./../build/contracts/DaoRewardsStorage.json');
//
// const DaoInfoServiceJson = require('./../build/contracts/DaoInfoService.json');
// const DaoListingServiceJson = require('./../build/contracts/DaoListingService.json');
// const DaoCalculatorServiceJson = require('./../build/contracts/DaoCalculatorService.json');
//
// const DaoIdentityJson = require('./../build/contracts/DaoIdentity.json');
// const DaoJson = require('./../build/contracts/Dao.json');
// const DaoVotingJson = require('./../build/contracts/DaoVoting.json');
// const DaoVotingClaimsJson = require('./../build/contracts/DaoVotingClaims.json');
// const DaoStakeLockingJson = require('./../build/contracts/DaoStakeLocking.json');
// const DaoFundingManagerJson = require('./../build/contracts/DaoFundingManager.json');
// const QuarterPointJson = require('./../build/contracts/QuarterPoint.json');
// const ReputationPointJson = require('./../build/contracts/ReputationPoint.json');
// const DaoRewardsManagerJson = require('./../build/contracts/DaoRewardsManager.json');
//
// const ContractResolver = artifacts.require('./ContractResolver.sol');
// const DoublyLinkedList = artifacts.require('./DoublyLinkedList.sol');
//
// const IdentityStorage = artifacts.require('./IdentityStorage.sol');
// const DaoConfigsStorage = artifacts.require('./DaoConfigsStorage.sol');
// const DaoStakeStorage = artifacts.require('./DaoStakeStorage.sol');
// const DaoPointsStorage = artifacts.require('./DaoPointsStorage.sol');
// const DaoStorage = artifacts.require('./DaoStorage.sol');
// const DaoSpecialStorage = artifacts.require('./DaoSpecialStorage.sol');
// const DaoFundingStorage = artifacts.require('./DaoFundingStorage.sol');
// const DaoRewardsStorage = artifacts.require('./DaoRewardsStorage.sol');
//
// const DaoInfoService = artifacts.require('./DaoInfoService.sol');
// const DaoListingService = artifacts.require('./DaoListingService.sol');
// const DaoCalculatorService = artifacts.require('./DaoCalculatorService.sol');
//
// const DaoIdentity = artifacts.require('./DaoIdentity.sol');
// const Dao = artifacts.require('./Dao.sol');
// const DaoVoting = artifacts.require('./DaoVoting.sol');
// const DaoVotingClaims = artifacts.require('./DaoVotingClaims.sol');
// const DaoStakeLocking = artifacts.require('./DaoStakeLocking.sol');
// const DaoFundingManager = artifacts.require('./DaoFundingManager.sol');
// const QuarterPoint = artifacts.require('./QuarterPoint.sol');
// const ReputationPoint = artifacts.require('./ReputationPoint.sol');
// const DaoRewardsManager = artifacts.require('./DaoRewardsManager.sol');

const deployLibraries = async function () {
  const libs = {};
  libs.doublyLinkedList = await DoublyLinkedList.new();
  return libs;
};

const deployNewContractResolver = async function (contracts) {
  contracts.resolver = await ContractResolver.new();
};

const getAccountsAndAddressOf = function (accounts) {
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
    dgdHolder6: accounts[13],
    allBadgeHolders: [accounts[4], accounts[5], accounts[6], accounts[7]],
    allParticipants: [accounts[4], accounts[5], accounts[6], accounts[7], accounts[8], accounts[9], accounts[10], accounts[11], accounts[12], accounts[13]],
  };
  return addressOf;
};

const getAllParticipantAddresses = function (accounts) {
  const addresses = [];
  for (const i of indexRange(3, 14)) {
    addresses.push(accounts[i]);
  }
  return addresses;
};

const deployStorage = async function (libs, contracts, resolver) {
  IdentityStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.identityStorage = await IdentityStorage.new(resolver.address);
  contracts.daoConfigsStorage = await DaoConfigsStorage.new(resolver.address);
  DaoStakeStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.daoStakeStorage = await DaoStakeStorage.new(resolver.address);
  contracts.daoPointsStorage = await DaoPointsStorage.new(resolver.address);
  DaoStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  DaoSpecialStorage.link('DoublyLinkedList', libs.doublyLinkedList.address);
  contracts.daoStorage = await DaoStorage.new(resolver.address);
  contracts.daoSpecialStorage = await DaoSpecialStorage.new(resolver.address);
  contracts.daoFundingStorage = await DaoFundingStorage.new(resolver.address);
  contracts.daoRewardsStorage = await DaoRewardsStorage.new(resolver.address);
};

const registerInteractive = async function (resolver, addressOf) {
  const callingKeys = [
    'c:dao:identity',
    'c:stake:locking',
    'c:dao',
    'c:config:controller',
    'i:quarter:point',
    'i:reputation:point',
    'i:dao:fundingmanager',
    'c:dao:rewards:manager',
  ];
  await a.map(callingKeys, 10, key => resolver.register_contract(key, addressOf.root));
};

const deployServices = async function (libs, contracts, resolver) {
  contracts.daoInfoService = await DaoInfoService.new(resolver.address);
  contracts.daoListingService = await DaoListingService.new(resolver.address);
  contracts.daoCalculatorService = await DaoCalculatorService.new(resolver.address);
};

const deployInteractive = async function (libs, contracts, resolver) {
  contracts.daoStakeLocking = await DaoStakeLocking.new(resolver.address, contracts.dgdToken.address, contracts.badgeToken.address);
  contracts.daoIdentity = await DaoIdentity.new(resolver.address);
  contracts.daoFundingManager = await DaoFundingManager.new(resolver.address);
  contracts.dao = await Dao.new(resolver.address);
  contracts.daoVoting = await DaoVoting.new(resolver.address);
  contracts.daoVotingClaims = await DaoVotingClaims.new(resolver.address);
  contracts.daoQuarterPoint = await QuarterPoint.new(resolver.address);
  contracts.daoReputationPoint = await ReputationPoint.new(resolver.address);
  contracts.daoRewardsManager = await DaoRewardsManager.new(resolver.address);
};

const initialTransferTokens = async function (contracts, addressOf, bN) {
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
};

const proposalIds = {
  firstProposal: randomBytes32(),
  secondProposal: randomBytes32(),
  thirdProposal: randomBytes32(),
  fourthProposal: randomBytes32(),
};

const proposers = function (addressOf) {
  return {
    firstProposal: addressOf.dgdHolder1,
    secondProposal: addressOf.dgdHolder2,
    thirdProposal: addressOf.dgdHolder5,
    fourthProposal: addressOf.dgdHolder6,
  };
};

const endorsers = function (addressOf) {
  return {
    firstProposal: addressOf.badgeHolder1,
    secondProposal: addressOf.badgeHolder2,
    thirdProposal: addressOf.badgeHolder3,
    fourthProposal: addressOf.badgeHolder4,
  };
};

const moreVersions = {
  firstProposal: {
    versionTwo: randomBytes32(),
    versionThree: randomBytes32(),
  },
  secondProposal: {
    versionTwo: randomBytes32(),
    versionThree: randomBytes32(),
    versionFour: randomBytes32(),
  },
  thirdProposal: {
    versionTwo: randomBytes32(),
  },
};

const milestoneFundings = function (bN) {
  return {
    firstProposal: {
      versionOne: [bN(10 * (10 ** 18)), bN(15 * (10 ** 18)), bN(20 * (10 ** 18))],
      versionTwo: [bN(10 * (10 ** 18)), bN(20 * (10 ** 18)), bN(25 * (10 ** 18))],
      versionThree: [bN(10 * (10 ** 18)), bN(15 * (10 ** 18)), bN(15 * (10 ** 18)), bN(20 * (10 ** 18))],
    },
    secondProposal: {
      versionOne: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
      versionTwo: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
      versionThree: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
      versionFour: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
    },
    thirdProposal: {
      versionOne: [bN(20 * (10 ** 18)), bN(30 * (10 ** 18))],
      versionTwo: [bN(25 * (10 ** 18)), bN(25 * (10 ** 18))],
    },
    fourthProposal: {
      versionOne: [bN(1 * (10 ** 18)), bN(1 * (10 ** 18)), bN(2 * (10 ** 18)), bN(2 * (10 ** 18))],
    },
  };
};

const milestoneDurations = function (bN) {
  return {
    firstProposal: {
      versionOne: [bN(1000), bN(1500), bN(2000)],
      versionTwo: [bN(30), bN(30), bN(20)],
      versionThree: [bN(1000), bN(1500), bN(1500), bN(2000)],
    },
    secondProposal: {
      versionOne: [bN(500), bN(700), bN(300)],
      versionTwo: [bN(20), bN(20), bN(20)],
      versionThree: [bN(500), bN(700), bN(300)],
      versionFour: [bN(500), bN(700), bN(300)],
    },
    thirdProposal: {
      versionOne: [bN(2000), bN(3000)],
      versionTwo: [bN(10), bN(10)],
    },
    fourthProposal: {
      versionOne: [bN(25), bN(25), bN(25), bN(25)],
    },
  };
};

const finalRewards = function (bN) {
  return {
    firstProposal: bN(1 * (10 ** 18)),
    secondProposal: bN(1 * (10 ** 18)),
    thirdProposal: bN(1 * (10 ** 18)),
    fourthProposal: bN(1 * (10 ** 18)),
  };
};

const lastNonces = {
  badgeHolder1: 1,
  badgeHolder2: 1,
  badgeHolder3: 1,
  badgeHolder4: 1,
  dgdHolder1: 1,
  dgdHolder2: 1,
  dgdHolder3: 1,
  dgdHolder4: 1,
  dgdHolder5: 1,
  dgdHolder6: 1,
};

module.exports = {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  getAllParticipantAddresses,
  deployStorage,
  registerInteractive,
  deployServices,
  deployInteractive,
  initialTransferTokens,
  proposalIds,
  proposers,
  moreVersions,
  milestoneDurations,
  milestoneFundings,
  lastNonces,
  endorsers,
  finalRewards,
  // assignDeployedContracts,
};
