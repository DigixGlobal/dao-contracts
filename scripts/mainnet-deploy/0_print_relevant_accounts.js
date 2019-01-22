const {
  getAccountsAndAddressOf,
} = require('../../test/setup');

module.exports = async () => {
  web3.eth.getAccounts(async (e, accounts) => {
    console.log('[1] SEED DIRECTORY');

    const addressOf = {};
    getAccountsAndAddressOf(accounts, addressOf);
    console.log('\tget accounts \u2713');

    console.log('----------- ACCOUNTS -----------');
    console.log('ROOT    = ', addressOf.root, ' TO FUND = ', web3.toWei(6, 'ether'));
    console.log('FOUNDER = ', addressOf.founderBadgeHolder, ' TO FUND = ', web3.toWei(1, 'ether'));
    console.log('----------- ACCOUNTS -----------');
  });
};
