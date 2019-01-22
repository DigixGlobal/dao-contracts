const {
  getAccountsAndAddressOf,
} = require('../../test/setup');

const DaoIdentity = artifacts.require('DaoIdentity.sol');

const bN = web3.toBigNumber;

module.exports = async () => {
  web3.eth.getAccounts(async (e, accounts) => {
    console.log('[1] SEED DIRECTORY');

    const addressOf = {};
    getAccountsAndAddressOf(accounts, addressOf);
    console.log('\tget accounts \u2713');

    const daoIdentity = await DaoIdentity.deployed();
    console.log('\tget contract instance \u2713');

    await daoIdentity.addGroupUser(
      bN(2),
      addressOf.founderBadgeHolder,
      'add:founder',
      { from: addressOf.root },
    );
    console.log('\tadd users to directory \u2713');
  });
};
