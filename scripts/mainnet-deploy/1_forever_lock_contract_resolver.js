const {
  getAccountsAndAddressOf,
} = require('./helpers');

const ContractResolver = artifacts.require('ContractResolver.sol');

module.exports = async () => {
  web3.eth.getAccounts(async (e, accounts) => {
    const addressOf = {};
    getAccountsAndAddressOf(accounts, addressOf);
    console.log('\tget accounts \u2713');

    const contractResolver = await ContractResolver.deployed();
    console.log('\tget contract instance \u2713');

    await contractResolver.lock_resolver_forever({ from: addressOf.root });
    console.log('\tlock contract resolver \u2713');

    console.log('DONE');
  });
};
