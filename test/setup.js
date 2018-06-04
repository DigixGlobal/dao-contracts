const a = require('awaiting');

// const contract = require('truffle-contract');

const {
  indexRange,
  randomBytes32,
  randomAddress,
  randomBigNumber,
} = require('@digix/helpers/lib/helpers');

const {
  sampleStakeWeights,
  sampleBadgeWeights,
} = require('./daoHelpers');

const randomBigNumbers = function (bN, count, range) {
  return indexRange(0, count).map(() => randomBigNumber(bN, range));
};

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

const BADGE_HOLDER_COUNT = 4;
const DGD_HOLDER_COUNT = 6;

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
    badgeHolders: indexRange(4, 4 + BADGE_HOLDER_COUNT).map(id => accounts[id]), // accounts[4] to accounts[7]
    dgdHolders: indexRange(4 + BADGE_HOLDER_COUNT, 4 + BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(id => accounts[id]), // accounts[8] to accounts[13]
    allParticipants: indexRange(4, 4 + BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(id => accounts[id]), // accounts[4] to accounts[13]
  };
  console.log('got getAccountsAndAddressOf');
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
  await a.map(indexRange(0, DGD_HOLDER_COUNT + BADGE_HOLDER_COUNT), 20, async (index) => {
    await contracts.dgdToken.transfer(addressOf.allParticipants[index], sampleStakeWeights(bN)[index]);
  });

  await a.map(indexRange(0, BADGE_HOLDER_COUNT), 20, async (index) => {
    await contracts.badgeToken.transfer(addressOf.badgeHolders[index], sampleBadgeWeights(bN)[index]);
  });
};

const getProposalStruct = function (bN, proposer, endorser, versions, generateRandom = false) {
  if (generateRandom) {
    versions = [];
    for (let i=0;i<3;i++) {
      versions.push({
        versionId: randomAddress,
        milestoneCount: 3,
        milestoneFundings: randomBigNumbers(bN, 3, 20),
        milestoneDurations: randomBigNumbers(bN, 3, 1000),
        finalReward: randomBigNumber(bN, 20),
      });
    }
  }
  return {
    id: versions[0].versionId,
    proposer,
    endorser,
    versions,
  };
};

const getTestProposals = function (bN, addressOf) {
  return [
    getProposalStruct(
      bN,
      addressOf.dgdHolders[0],
      addressOf.badgeHolders[0],
      [{
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(10 * (10 ** 18)), bN(15 * (10 ** 18)), bN(20 * (10 ** 18))],
        milestoneDurations: [bN(1000), bN(1500), bN(2000)],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(10 * (10 ** 18)), bN(20 * (10 ** 18)), bN(25 * (10 ** 18))],
        milestoneDurations: [bN(30), bN(30), bN(20)],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(10 * (10 ** 18)), bN(15 * (10 ** 18)), bN(15 * (10 ** 18)), bN(20 * (10 ** 18))],
        milestoneDurations: [bN(1000), bN(1500), bN(1500), bN(2000)],
        finalReward: bN(1 * (10 ** 18)),
      }],
    ),

    getProposalStruct(
      bN,
      addressOf.dgdHolders[1],
      addressOf.badgeHolders[1],
      [{
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
        milestoneDurations: [bN(500), bN(700), bN(300)],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
        milestoneDurations: [bN(20), bN(20), bN(20)],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
        milestoneDurations: [bN(500), bN(700), bN(300)],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: randomAddress(),
        milestoneCount: 3,
        milestoneFundings: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
        milestoneDurations: [bN(500), bN(700), bN(300)],
        finalReward: bN(1 * (10 ** 18)),
      }],
    ),

    getProposalStruct(
      bN,
      addressOf.dgdHolders[4],
      addressOf.badgeHolders[2],
      [{
        versionId: randomAddress(),
        milestoneCount: 2,
        milestoneFundings: [bN(20 * (10 ** 18)), bN(30 * (10 ** 18))],
        milestoneDurations: [bN(2000), bN(3000)],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: randomAddress(),
        milestoneCount: 2,
        milestoneFundings: [bN(25 * (10 ** 18)), bN(25 * (10 ** 18))],
        milestoneDurations: [bN(10), bN(10)],
        finalReward: bN(1 * (10 ** 18)),
      }],
    ),

    getProposalStruct(
      bN,
      addressOf.dgdHolders[5],
      addressOf.badgeHolders[3],
      [{
        versionId: randomAddress(),
        milestoneCount: 4,
        milestoneFundings: [bN(1 * (10 ** 18)), bN(1 * (10 ** 18)), bN(2 * (10 ** 18)), bN(2 * (10 ** 18))],
        milestoneDurations: [bN(25), bN(25), bN(25), bN(25)],
        finalReward: bN(1 * (10 ** 18)),
      }],
    ),

  ];
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
  getTestProposals,
  BADGE_HOLDER_COUNT,
  DGD_HOLDER_COUNT,
  // assignDeployedContracts,
};
