const {
  getAccountsAndAddressOf,
  uploadAttestation,
  uploadMoreDoc,
} = require('./helpers');

const {
  daoConstantsKeys,
} = require('../../test/daoHelpers');

const {
  getCurrentTimestamp,
} = require('@digix/helpers/lib/helpers');

const newProposal = require('../../static/json/new-proposal.json');

const dijixUtil = require('../dijixUtil');

const Dao = artifacts.require('Dao.sol');
const DaoVoting = artifacts.require('DaoVoting.sol');
const DaoVotingClaims = artifacts.require('DaoVotingClaims.sol');
const DaoConfigsStorage = artifacts.require('MockDaoConfigsStorage.sol');

const bN = web3.toBigNumber;

const dotenv = require('dotenv');

const setDummyConfig = async function (contracts, bN, initial = false) {
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION, bN(process.env.LOCKING_PHASE));
  await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_QUARTER_DURATION, bN(process.env.QUARTER_DURATION));
  if (initial) {
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_DRAFT_VOTING_PHASE, bN(15));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE, bN(20));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTING_COMMIT_PHASE, bN(15));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTING_PHASE_TOTAL, bN(30));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE, bN(15));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL, bN(30));
  } else {
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTING_COMMIT_PHASE, bN(process.env.COMMIT_ROUND));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTING_PHASE_TOTAL, bN(process.env.VOTING_ROUND));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_INTERIM_COMMIT_PHASE, bN(process.env.COMMIT_ROUND));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL, bN(process.env.VOTING_ROUND));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE, bN(process.env.COMMIT_ROUND));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL, bN(process.env.VOTING_ROUND));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_DRAFT_VOTING_PHASE, bN(process.env.DRAFT_VOTING_PHASE));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE, bN(process.env.VOTE_CLAIMING_DEADLINE));
  }
};

module.exports = async () => {
  dotenv.config();
  const addressOf = {};
  web3.eth.getAccounts(async (e, accounts) => {
    getAccountsAndAddressOf(accounts, addressOf);

    const dao = await Dao.deployed();
    const daoVoting = await DaoVoting.deployed();
    const daoVotingClaims = await DaoVotingClaims.deployed();
    const daoConfigsStorage = await DaoConfigsStorage.deployed();
    console.log('got contracts');

    const contracts = {
      dao, daoVoting, daoVotingClaims, daoConfigsStorage,
    };

    console.log('setting dummy config');
    await setDummyConfig(contracts, bN, true);
    console.log('set dummy config');

    console.log('initializing dijix');
    dijixUtil.init(process.env.IPFS_ENDPOINT, process.env.HTTP_ENDPOINT);
    console.log('initialized dijix');
    newProposal.title += ' - '.concat(getCurrentTimestamp().toString());
    console.log('uploading docs');
    const proposal = await uploadAttestation(
      newProposal, bN, addressOf,
      addressOf.dgdHolders[0], addressOf.badgeHolders[0],
    );
    console.log('uploaded docs');

    // create a new proposal
    console.log('creating new proposal');
    await dao.submitPreproposal(
      proposal.id,
      proposal.versions[0].milestoneFundings,
      proposal.versions[0].finalReward,
      { from: proposal.proposer, value: 2 * (10 ** 18) },
    );
    console.log('created new proposal');

    console.log('endorsing proposal');
    await dao.endorseProposal(proposal.id, { from: proposal.endorser });
    console.log('endorsed proposal');

    console.log('finalizing proposal');
    await dao.finalizeProposal(proposal.id, { from: proposal.proposer });
    console.log('finalized proposal');

    const moreDoc = await uploadMoreDoc();
    console.log('appending more doc');
    await dao.addProposalDoc(proposal.id, moreDoc, { from: proposal.proposer });
    console.log('appended more doc');

    console.log('setting correct config');
    await setDummyConfig(contracts, bN);
    console.log('set correct config');
  });
};
