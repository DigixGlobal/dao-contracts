const {
  getAccountsAndAddressOf,
} = require('./helpers');

const {
  daoConstantsKeys,
} = require('../../test/daoHelpers');

const {
  randomBytes32,
} = require('@digix/helpers/lib/helpers');

const Dao = artifacts.require('Dao.sol');
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
    const daoConfigsStorage = await DaoConfigsStorage.deployed();
    console.log('got contracts');

    const contracts = {
      dao, daoConfigsStorage,
    };

    console.log('setting dummy config');
    await setDummyConfig(contracts, bN, true);
    console.log('set dummy config');

    const proposalId = randomBytes32();

    // create a new proposal
    console.log('creating new proposal (IPFS timeout)');
    await dao.submitPreproposal(
      proposalId,
      [bN(2 * (10 ** 18)), bN(3 * (10 ** 18))],
      bN(1 * (10 ** 18)),
      { from: addressOf.dgdHolders[0], value: 2 * (10 ** 18) },
    );
    console.log('created new proposal (IPFS timeout)');
  });
};
