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
    await daoIdentity.addGroupUser(
      bN(4),
      process.env.KEYSTORE_KYC_ADMIN,
      'add:keystore:kycadmin',
      { from: addressOf.root },
    );
    console.log('\tadd accounts as roles \u2713');
  });
};
