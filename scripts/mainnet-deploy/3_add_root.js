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

    assert.ok(!isInvalid(process.env.MULTISIG), 'Please provide the address for MULTISIG');

    await daoIdentity.addGroupUser(
      bN(1),
      process.env.MULTISIG,
      'add:multisig:root',
      { from: addressOf.root, gas: 300000 },
    );
    console.log('\tadd multisig wallet as root \u2713');

    console.log('DONE');
  });
};
