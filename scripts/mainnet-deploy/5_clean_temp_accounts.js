const {
  getAccountsAndAddressOf,
} = require('../../test/setup');

const DaoIdentity = artifacts.require('DaoIdentity.sol');

module.exports = async () => {
  web3.eth.getAccounts(async (e, accounts) => {
    const addressOf = {};
    getAccountsAndAddressOf(accounts, addressOf);
    console.log('\tget accounts \u2713');

    const daoIdentity = await DaoIdentity.deployed();
    console.log('\tget contract instance \u2713');

    await daoIdentity.removeGroupUser(
      addressOf.founderBadgeHolder,
      { from: addressOf.root },
    );
    console.log('\tremove sigmate founder \u2713');
  });
};
