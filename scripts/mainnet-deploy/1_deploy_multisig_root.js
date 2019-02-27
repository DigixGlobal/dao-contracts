const {
  getAccountsAndAddressOf,
} = require('./helpers');

const MultiSigWallet = artifacts.require('MultiSigWallet.sol');

const bN = web3.toBigNumber;

module.exports = async () => {
  web3.eth.getAccounts(async (e, accounts) => {
    console.log('DEPLOY MULTISIGWALLET');

    const addressOf = {};
    getAccountsAndAddressOf(accounts, addressOf);
    console.log('\tget accounts \u2713');

    const owners = process.env.OWNERS.split(',');
    const minRequired = process.env.MIN_REQUIRED;
    console.log('\tgot args \u2713');

    const txn = await MultiSigWallet.new(owners, bN(minRequired));
    console.log('\tdeployed multisig wallet \u2713');
    console.log('\tdeployment txn = ', txn);
  });
};
