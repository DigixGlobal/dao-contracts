const assert = require('assert');

const {
  getAccountsAndAddressOf,
} = require('./helpers');

const {
  zeroString,
} = require('@digix/helpers/lib/helpers');

const DaoStorage = artifacts.require('DaoStorage.sol');
const Dao = artifacts.require('Dao.sol');

const bN = web3.toBigNumber;

module.exports = async () => {
  const addressOf = {};
  web3.eth.getAccounts(async (e, accounts) => {
    getAccountsAndAddressOf(accounts, addressOf);

    const daoStorage = await DaoStorage.deployed();
    const dao = await Dao.deployed();

    const proposalId = process.env.PROPOSAL_ID;
    const actionId = parseInt(process.env.ACTION_ID, 10);
    const proposal = await daoStorage.readProposal.call(proposalId);
    assert.ok(proposal[0] !== zeroString, 'No proposal with id = PROPOSAL_ID found');
    assert.ok((actionId >= 1 && actionId <= 3), 'ACTION_ID should be either 1, 2 or 3');

    console.log('input checks passed. Updating PRL status');
    await dao.updatePRL(
      proposalId,
      bN(actionId),
      '',
      { from: addressOf.prl },
    );
    console.log('PRL status of ', proposalId, ' has been updated');
  });
};
