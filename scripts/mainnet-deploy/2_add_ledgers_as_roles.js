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

    assert.ok(isInvalid(process.env.LEDGER_FOUNDER), 'Please provide the address for LEDGER_FOUNDER');
    assert.ok(isInvalid(process.env.LEDGER_PRL), 'Please provide the address for LEDGER_PRL');
    assert.ok(isInvalid(process.env.LEDGER_KYC_ADMIN), 'Please provide the address for LEDGER_KYC_ADMIN');

    await daoIdentity.addGroupUser(
      bN(2),
      process.env.LEDGER_FOUNDER,
      'add:ledger:founder',
      { from: addressOf.root },
    );
    await daoIdentity.addGroupUser(
      bN(3),
      process.env.LEDGER_PRL,
      'add:ledger:prl',
      { from: addressOf.root },
    );
    await daoIdentity.addGroupUser(
      bN(4),
      process.env.LEDGER_KYC_ADMIN,
      'add:ledger:kycadmin',
      { from: addressOf.root },
    );
    console.log('\tadd accounts as roles \u2713');
  });
};
