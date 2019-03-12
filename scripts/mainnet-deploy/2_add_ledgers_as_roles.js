const assert = require('assert');

const {
  getAccountsAndAddressOf,
  isInvalid,
} = require('./helpers');

const DaoIdentity = artifacts.require('DaoIdentity.sol');

const bN = web3.toBigNumber;

module.exports = async () => {
  web3.eth.getAccounts(async (e, accounts) => {
    const addressOf = {};
    getAccountsAndAddressOf(accounts, addressOf);
    console.log('\tget accounts \u2713');

    const daoIdentity = await DaoIdentity.deployed();
    console.log('\tget contract instance \u2713');

    assert.ok(!isInvalid(process.env.LEDGER_FOUNDER), 'Please provide the address for LEDGER_FOUNDER');
    assert.ok(!isInvalid(process.env.LEDGER_PRL), 'Please provide the address for LEDGER_PRL');

    const ledgerFounders = process.env.LEDGER_FOUNDER.split(',');
    const ledgerPrls = process.env.LEDGER_PRL.split(',');

    for (const founder of ledgerFounders) {
      assert.ok(!isInvalid(founder), 'One of the Founder addresses is invalid');
      await daoIdentity.addGroupUser(
        bN(2),
        founder,
        'add:ledger:founder',
        { from: addressOf.root },
      );
    }
    console.log('\tadd Founders \u2713');
    for (const prl of ledgerPrls) {
      assert.ok(!isInvalid(prl), 'One of the PRL addresses is invalid');
      await daoIdentity.addGroupUser(
        bN(3),
        prl,
        'add:ledger:prl',
        { from: addressOf.root },
      );
    }
    console.log('\tadd PRLs \u2713');

    console.log('DONE');
  });
};
