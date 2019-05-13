const assert = require('assert');

const DaoSpecialProposal = artifacts.require('DaoSpecialProposal.sol');
const DaoConfigsStorage = artifacts.require('DaoConfigsStorage.sol');

const {
  encodeHash,
} = require('@digix/helpers/lib/helpers');

const {
  isInvalid,
} = require('./helpers');

const indexes = {
  CONFIG_DRAFT_VOTING_PHASE: 42,
  CONFIG_VOTING_COMMIT_PHASE: 2,
  CONFIG_VOTING_PHASE_TOTAL: 3,
  CONFIG_INTERIM_COMMIT_PHASE: 4,
  CONFIG_INTERIM_PHASE_TOTAL: 5,
  CONFIG_VOTE_CLAIMING_DEADLINE: 49,
  CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE: 25,
  CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL: 26,
};

const bN = web3.toBigNumber;

module.exports = async () => {
  const daoSpecialProposal = await DaoSpecialProposal.deployed();
  const daoConfigsStorage = await DaoConfigsStorage.deployed();

  const uintConfigs = await daoConfigsStorage.readUintConfigs.call();

  assert.ok(!isInvalid(process.env.DOC_IPFS_HASH), 'Please provide the value for DOC_IPFS_HASH');
  assert.ok(!isInvalid(process.env.CONFIG_DRAFT_VOTING_PHASE), 'Please provide the value for CONFIG_DRAFT_VOTING_PHASE');
  assert.ok(!isInvalid(process.env.CONFIG_VOTING_COMMIT_PHASE), 'Please provide the value for CONFIG_VOTING_COMMIT_PHASE');
  assert.ok(!isInvalid(process.env.CONFIG_VOTING_PHASE_TOTAL), 'Please provide the value for CONFIG_VOTING_PHASE_TOTAL');
  assert.ok(!isInvalid(process.env.CONFIG_VOTE_CLAIMING_DEADLINE), 'Please provide the value for CONFIG_VOTE_CLAIMING_DEADLINE');
  assert.ok(!isInvalid(process.env.CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE), 'Please provide the value for CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE');
  assert.ok(!isInvalid(process.env.CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL), 'Please provide the value for CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL');

  uintConfigs[indexes.CONFIG_DRAFT_VOTING_PHASE] = bN(process.env.CONFIG_DRAFT_VOTING_PHASE);
  uintConfigs[indexes.CONFIG_VOTING_COMMIT_PHASE] = bN(process.env.CONFIG_VOTING_COMMIT_PHASE);
  uintConfigs[indexes.CONFIG_VOTING_PHASE_TOTAL] = bN(process.env.CONFIG_VOTING_PHASE_TOTAL);
  uintConfigs[indexes.CONFIG_VOTE_CLAIMING_DEADLINE] = bN(process.env.CONFIG_VOTE_CLAIMING_DEADLINE);
  uintConfigs[indexes.CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE] = bN(process.env.CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE);
  uintConfigs[indexes.CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL] = bN(process.env.CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL);

  const encodedHash = encodeHash(process.env.DOC_IPFS_HASH);
  const result = daoSpecialProposal.createSpecialProposal.request(
    encodedHash,
    uintConfigs,
    [], [],
  );
  console.log('result = ', result);
};
