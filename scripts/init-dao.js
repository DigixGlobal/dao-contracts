const a = require('awaiting');

const MockDgd = artifacts.require('./MockDgd.sol');
const MockBadge = artifacts.require('./MockBadge.sol');
const MockDgxStorage = artifacts.require('./MockDgxStorage.sol');
const MockDgx = artifacts.require('./MockDgx.sol');
const MockDgxDemurrageReporter = artifacts.require('./MockDgxDemurrageReporter.sol');

const ContractResolver = artifacts.require('./ContractResolver.sol');
const DoublyLinkedList = artifacts.require('./DoublyLinkedList.sol');

const DaoIdentityStorage = artifacts.require('./DaoIdentityStorage.sol');
const DaoConfigsStorage = artifacts.require('./MockDaoConfigsStorage.sol');
const DaoStakeStorage = artifacts.require('./DaoStakeStorage.sol');
const DaoPointsStorage = artifacts.require('./DaoPointsStorage.sol');
const DaoStorage = artifacts.require('./DaoStorage.sol');
const DaoUpgradeStorage = artifacts.require('./DaoUpgradeStorage.sol');
const DaoSpecialStorage = artifacts.require('./DaoSpecialStorage.sol');
const DaoRewardsStorage = artifacts.require('./DaoRewardsStorage.sol');
const IntermediateResultsStorage = artifacts.require('./IntermediateResultsStorage.sol');

const DaoListingService = artifacts.require('./DaoListingService.sol');
const DaoCalculatorService = artifacts.require('./DaoCalculatorService.sol');

const DaoIdentity = artifacts.require('./DaoIdentity.sol');
const Dao = artifacts.require('./Dao.sol');
const DaoSpecialProposal = artifacts.require('./DaoSpecialProposal.sol');
const DaoVoting = artifacts.require('./DaoVoting.sol');
const DaoVotingClaims = artifacts.require('./DaoVotingClaims.sol');
const DaoSpecialVotingClaims = artifacts.require('./DaoSpecialVotingClaims.sol');
const DaoStakeLocking = artifacts.require('./DaoStakeLocking.sol');
const DaoFundingManager = artifacts.require('./DaoFundingManager.sol');
const DaoRewardsManager = artifacts.require('./DaoRewardsManager.sol');

const {
  fundUserAndApproveForStakeLocking,
  lockDGDs,
  getAccountsAndAddressOf,
  getProposalStruct,
  setDummyConfig,
  initialTransferTokens,
  waitFor,
  phaseCorrection,
  initDao,
  addProposal,
  redeemBadges,
  endorseProposal,
  assignVotesAndCommits,
} = require('../test/setup');

const {
  phases,
  quarters,
} = require('../test/daoHelpers');

const {
  getCurrentTimestamp,
  encodeHash,
} = require('@digix/helpers/lib/helpers');

const dijixUtil = require('./dijixUtil');

let proposals;
let participants;

const bN = web3.toBigNumber;

const dotenv = require('dotenv');
const proposalsJson = require('../static/json/proposals.json');

// Test scenario structs for proposals
const getTestProposals = function (bN, addressOf, proposalHashes) {
  // Test scenario structs for psls

  return [
    getProposalStruct(
      bN,
      addressOf.dgdHolders[0],
      addressOf.badgeHolders[0],
      [{
        versionId: encodeHash(proposalHashes[0].versions[0].ipfsHash),
        milestoneFundings: [bN(2 * (10 ** 18)), bN(3 * (10 ** 18))],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: encodeHash(proposalHashes[0].versions[1].ipfsHash),
        milestoneFundings: [bN(2 * (10 ** 18)), bN(4 * (10 ** 18))],
        finalReward: bN(1 * (10 ** 18)),
      }],
    ),

    getProposalStruct(
      bN,
      addressOf.dgdHolders[1],
      addressOf.badgeHolders[1],
      [{
        versionId: encodeHash(proposalHashes[1].versions[0].ipfsHash),
        milestoneFundings: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18))],
        finalReward: bN(1 * (10 ** 18)),
      }, {
        versionId: encodeHash(proposalHashes[1].versions[1].ipfsHash),
        milestoneFundings: [bN(6 * (10 ** 18)), bN(7 * (10 ** 18))],
        finalReward: bN(1 * (10 ** 18)),
      }],
    ),
  ];
};

const setupMockTokens = async function (contracts, addressOf) {
  contracts.dgdToken = await MockDgd.deployed();
  contracts.badgeToken = await MockBadge.deployed();
  contracts.dgxStorage = await MockDgxStorage.deployed();
  contracts.dgxToken = await MockDgx.deployed();
  await contracts.dgxStorage.setInteractive(contracts.dgxToken.address);
  contracts.demurrageReporter = await MockDgxDemurrageReporter.deployed();
  console.log('transferring initial tokens');
  await initialTransferTokens(contracts, addressOf, bN);
};

const assignDeployedContracts = async function (contracts, libs) {
  contracts.resolver = await ContractResolver.deployed();
  libs.doublyLinkedList = await DoublyLinkedList.deployed();

  contracts.daoIdentityStorage = await DaoIdentityStorage.deployed();
  contracts.daoConfigsStorage = await DaoConfigsStorage.deployed();
  contracts.daoStakeStorage = await DaoStakeStorage.deployed();
  contracts.daoPointsStorage = await DaoPointsStorage.deployed();
  contracts.daoStorage = await DaoStorage.deployed();
  contracts.daoUpgradeStorage = await DaoUpgradeStorage.deployed();
  contracts.daoSpecialStorage = await DaoSpecialStorage.deployed();
  contracts.daoRewardsStorage = await DaoRewardsStorage.deployed();
  contracts.intermediateResultsStorage = await IntermediateResultsStorage.deployed();

  contracts.daoListingService = await DaoListingService.deployed();
  contracts.daoCalculatorService = await DaoCalculatorService.deployed();

  contracts.daoStakeLocking = await DaoStakeLocking.deployed();
  contracts.daoIdentity = await DaoIdentity.deployed();
  contracts.daoFundingManager = await DaoFundingManager.deployed();
  contracts.dao = await Dao.deployed();
  contracts.daoSpecialProposal = await DaoSpecialProposal.deployed();
  contracts.daoVoting = await DaoVoting.deployed();
  contracts.daoVotingClaims = await DaoVotingClaims.deployed();
  contracts.daoSpecialVotingClaims = await DaoSpecialVotingClaims.deployed();
  contracts.daoRewardsManager = await DaoRewardsManager.deployed();
};

const kycProposers = async function (contracts, addressOf) {
  const expiry = getCurrentTimestamp() + 2628000; // KYC valid for 1 month
  await a.map(proposals, 20, async (proposal) => {
    console.log('updating KYC for proposer ', proposal.proposer);
    await contracts.daoIdentity.updateKyc(proposal.proposer, '', expiry, { from: addressOf.kycadmin });
  });
};

const addAndEndorseProposals = async function (contracts, proposals) {
  await a.map(proposals, 20, async (proposal) => {
    await addProposal(contracts, proposal);
    await endorseProposal(contracts, proposal);
  });
};

const uploadAttestations = async function (_proposals) {
  const docs = [
    {
      versions: [],
    },
    {
      versions: [],
    },
  ];
  let i = 0;
  let j = 1;
  for (const _proposal of _proposals) {
    for (const _proposalVersion of _proposal.versions) {
      const doc = await dijixUtil.getDijix()
        .create('attestation', {
          attestation: _proposalVersion,
          proofs: [
            { type: 'image', src: `${__dirname}/../static/images/${j}.jpg` },
          ],
        });
      j++;
      docs[i].versions.push(doc);
      console.log('uploaded = ', doc.ipfsHash);
    }
    i++;
  }

  return docs;
};

module.exports = async function () {
  const addressOf = {};
  const contracts = {};
  const libs = {};
  dotenv.config();
  await web3.eth.getAccounts(async function (e, accounts) {
    getAccountsAndAddressOf(accounts, addressOf);

    participants = [
      {
        address: addressOf.badgeHolders[0],
        redeemingBadge: true,
        dgdToLock: bN(110e9),
      },
      {
        address: addressOf.badgeHolders[1],
        redeemingBadge: true,
        dgdToLock: bN(210e9),
      },
      {
        address: addressOf.badgeHolders[2],
        redeemingBadge: true,
        dgdToLock: bN(200e9),
      },
      {
        address: addressOf.badgeHolders[3],
        redeemingBadge: true,
        dgdToLock: bN(550e9),
      },
      {
        address: addressOf.dgdHolders[0],
        dgdToLock: bN(60e9),
      },
      {
        address: addressOf.dgdHolders[1],
        dgdToLock: bN(150e9),
      },
      {
        address: addressOf.dgdHolders[2],
        dgdToLock: bN(90e9),
      },
      {
        address: addressOf.dgdHolders[3],
        dgdToLock: bN(120e9),
      },
      {
        address: addressOf.dgdHolders[4],
        dgdToLock: bN(50e9),
      },
      {
        address: addressOf.dgdHolders[5],
        dgdToLock: bN(100e9),
      },
    ];

    // get deployed mock tokens
    await setupMockTokens(contracts, addressOf);
    console.log('setup tokens');

    await assignDeployedContracts(contracts, libs);
    console.log('got the deployed contracts');

    // set dummy config for testing
    await setDummyConfig(contracts, bN);
    console.log('setup dummy config');

    // start dao and fund dao
    await initDao(contracts, addressOf, bN, web3);
    console.log('setup and funded dao');

    await fundUserAndApproveForStakeLocking(web3, contracts, bN, participants, addressOf);
    console.log('\tfunded users DGDs and Badges');
    await waitFor(2, addressOf, web3);
    await lockDGDs(web3, contracts, bN, participants, addressOf);
    console.log('\tusers locked DGDs for first quarter');
    await redeemBadges(web3, contracts, bN, participants);
    console.log('\tusers redeemed badges');

    // create some proposals in the main phase, assert that its the same quarter
    await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE, quarters.QUARTER_1);

    // upload proposal details on ipfs
    dijixUtil.init(process.env.IPFS_ENDPOINT, process.env.HTTP_ENDPOINT);
    const proposalHashes = await uploadAttestations(proposalsJson);
    console.log('uploaded attestations');

    // preparing proposals
    console.log('proposalHashes = ', JSON.stringify(proposalHashes));
    proposals = getTestProposals(bN, addressOf, proposalHashes);
    console.log(proposals);

    await kycProposers(contracts, addressOf);
    console.log('kyc approved proposers');
    await addAndEndorseProposals(contracts, proposals);
    console.log('added and endorsed proposals');

    console.log(assignVotesAndCommits(addressOf, 2, 10));
  });
};
