const {
  getAccountsAndAddressOf,
} = require('./helpers');

const {
  randomBytes32,
} = require('@digix/helpers/lib/helpers');

const DaoSpecialProposal = artifacts.require('DaoSpecialProposal.sol');
const DaoConfigsStorage = artifacts.require('MockDaoConfigsStorage.sol');

const bN = web3.toBigNumber;

module.exports = async () => {
  const addressOf = {};
  web3.eth.getAccounts(async (e, accounts) => {
    getAccountsAndAddressOf(accounts, addressOf);
    console.log('got addresses');

    const daoSpecialProposal = await DaoSpecialProposal.deployed();
    const daoConfigsStorage = await DaoConfigsStorage.deployed();

    const configs = await daoConfigsStorage.readUintConfigs.call();
    configs[23] = bN(3);
    configs[24] = bN(4);
    configs[25] = bN(5);

    console.log('creating special proposal');
    const specialProposalId = randomBytes32();
    await daoSpecialProposal.createSpecialProposal(
      specialProposalId,
      configs, [], [],
      { from: addressOf.founderBadgeHolder },
    );
    await daoSpecialProposal.startSpecialProposalVoting(
      specialProposalId,
      { from: addressOf.founderBadgeHolder },
    );
    console.log('created special proposal = ', specialProposalId);
  });
};
