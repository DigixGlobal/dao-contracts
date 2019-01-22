const assert = require('assert');

const {
  getAccountsAndAddressOf,
  getCurrentTimestamp,
} = require('../../test/setup');

const Dao = artifacts.require('Dao.sol');

const bN = web3.toBigNumber;

module.exports = async () => {
  web3.eth.getAccounts(async (e, accounts) => {
    const addressOf = {};
    getAccountsAndAddressOf(accounts, addressOf);
    console.log('\tget accounts \u2713');

    const dao = await Dao.deployed();
    console.log('\tget contract instance \u2713');

    const timeNow = getCurrentTimestamp();
    const startOfDigixDAO = parseInt(process.env.START_TIMESTAMP, 10);
    assert(startOfDigixDAO > timeNow, 'START_TIMESTAMP should be a future unix timestamp');
    console.log('\tcheck start time \u2713');

    await dao.setStartOfFirstQuarter(
      bN(startOfDigixDAO),
      { from: addressOf.founderBadgeHolder },
    );
    console.log('\tset start of DigixDAO \u2713');
  });
};
