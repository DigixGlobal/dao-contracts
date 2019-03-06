const a = require('awaiting');

const {
  getAccountsAndAddressOf,
  uploadAttestation,
  proposalStates,
  waitFor,
  assignVotesAndCommits,
} = require('./helpers');

const {
  daoConstantsKeys,
} = require('../../test/daoHelpers');

const {
  getCurrentTimestamp,
  indexRange,
} = require('@digix/helpers/lib/helpers');

const newProposal = require('../../static/json/new-proposal.json');

const dijixUtil = require('../dijixUtil');

const Dao = artifacts.require('Dao.sol');
const DaoVoting = artifacts.require('DaoVoting.sol');
const DaoVotingClaims = artifacts.require('DaoVotingClaims.sol');
const DaoConfigsStorage = artifacts.require('MockDaoConfigsStorage.sol');

const bN = web3.toBigNumber;

const dotenv = require('dotenv');

const draftVotingAndClaim = async function (contracts, addressOf, proposals, shouldClaim = true) {
  await a.map(indexRange(0, proposals.length), 20, async (proposalIndex) => {
    await a.map(indexRange(0, addressOf.badgeHolders.length), 20, async (badgeHolderIndex) => {
      await contracts.daoVoting.voteOnDraft(
        proposals[proposalIndex].id,
        true,
        { from: addressOf.badgeHolders[badgeHolderIndex] },
      );
    });
  });


  if (!shouldClaim) {
    return;
  }

  await waitFor(15, addressOf, web3);
  await a.map(indexRange(0, proposals.length), 20, async (proposalIndex) => {
    await contracts.daoVotingClaims.claimDraftVotingResult(
      proposals[proposalIndex].id,
      bN(50),
      { from: proposals[proposalIndex].proposer },
    );
  });
};

const votingCommitAndRevealAndClaim = async function (contracts, addressOf, proposal, claim = true, result = true) {
  const { salts, votes, votingCommits } = assignVotesAndCommits(addressOf, 1, 10, null, result);

  await a.map(indexRange(0, 10), 20, async (holderIndex) => {
    await contracts.daoVoting.commitVoteOnProposal(
      proposal.id,
      bN(0),
      votingCommits[0][holderIndex],
      { from: addressOf.allParticipants[holderIndex] },
    );
  });

  await waitFor(15, addressOf, web3);

  await a.map(indexRange(0, 10), 20, async (holderIndex) => {
    await contracts.daoVoting.revealVoteOnProposal(
      proposal.id,
      bN(0),
      votes[0][holderIndex],
      salts[0][holderIndex],
      { from: addressOf.allParticipants[holderIndex] },
    );
  });

  await waitFor(15, addressOf, web3);

  if (claim) {
    await contracts.daoVotingClaims.claimProposalVotingResult(
      proposal.id,
      bN(0),
      bN(30),
      { from: proposal.proposer },
    );
  }
};

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

    const requiredStage = process.env.STAGE;

    // endorse proposal for all other cases
    if (requiredStage !== proposalStates.IDEA) {
      console.log('endorsing proposal');
      await dao.endorseProposal(proposal.id, { from: proposal.endorser });
      console.log('endorsed proposal');
    }

    // finalize proposal for all other cases
    if (
      requiredStage !== proposalStates.ENDORSED
      && requiredStage !== proposalStates.IDEA
    ) {
      console.log('finalizing proposal');
      await dao.finalizeProposal(proposal.id, { from: proposal.proposer });
      console.log('finalized proposal');
    }

    // conduct draft voting and claim it for all other cases
    if (
      requiredStage !== proposalStates.ENDORSED
      && requiredStage !== proposalStates.IDEA
      && requiredStage !== proposalStates.DRAFT
    ) {
      console.log('doing draft voting');
      await draftVotingAndClaim(contracts, addressOf, [proposal]);
      console.log('done with draft voting');
    }

    // conduct voting round and claim it for all other cases
    if (
      requiredStage !== proposalStates.ENDORSED
      && requiredStage !== proposalStates.IDEA
      && requiredStage !== proposalStates.DRAFT
      && requiredStage !== proposalStates.PROPOSAL
    ) {
      console.log('doing voting round');
      await votingCommitAndRevealAndClaim(contracts, addressOf, proposal);
      console.log('done with voting round');
    }

    // mark milestone as finished if its not in ongoing stage
    if (requiredStage === proposalStates.REVIEW) {
      console.log('marking milestone as finished');
      await dao.finishMilestone(proposal.id, bN(0), { from: proposal.proposer });
      console.log('marked milestone as finished');
    }

    console.log('setting correct config');
    await setDummyConfig(contracts, bN);
    console.log('set correct config');
  });
};
