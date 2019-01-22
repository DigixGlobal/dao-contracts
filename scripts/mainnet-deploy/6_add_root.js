const {
  getAccountsAndAddressOf,
} = require('../../test/setup');

const DaoIdentity = artifacts.require('DaoIdentity.sol');

const bN = web3.toBigNumber;

module.exports = async () => {
  web3.eth.getAccounts(async (e, accounts) => {
    const addressOf = {};
    getAccountsAndAddressOf(accounts, addressOf);
    console.log('\tget accounts \u2713');

    const daoIdentity = await DaoIdentity.deployed();
    console.log('\tget contract instance \u2713');

    await daoIdentity.addGroupUser(
      bN(1),
      process.env.MULTISIG,
      'add:multisig:root',
      { from: addressOf.root },
    );
  });
};