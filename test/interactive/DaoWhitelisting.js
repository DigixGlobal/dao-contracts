const a = require('awaiting');

const DaoIdentity = artifacts.require('./DaoIdentity.sol');
const DaoWhitelisting = artifacts.require('./DaoWhitelisting.sol');
const MockWhitelistedContract = artifacts.require('./MockWhitelistedContract.sol');

const {
  deployNewContractResolver,
  deployLibraries,
  deployStorage,
  getAccountsAndAddressOf,
} = require('./../setup');

const {
  randomAddress,
  randomBytes32,
  randomBytes32s,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

const doc = randomBytes32();
const proposer = randomAddress();
const fundings = [bN(100), bN(200), bN(50)];
const finalReward = bN(2);
const dgdStakes = [bN(3), bN(4), bN(5), bN(6)];
const randomCommits = randomBytes32s(10);

contract('DaoWhitelisting', function (accounts) {
  let libs;
  let contracts;
  let addressOf;

  before(async function () {
    libs = {};
    contracts = {};
    addressOf = {};
    await deployLibraries(libs);
    await deployNewContractResolver(contracts);
    await getAccountsAndAddressOf(accounts, addressOf);
    await deployStorage(libs, contracts, contracts.resolver, addressOf);
    contracts.daoIdentity = await DaoIdentity.new(contracts.resolver.address);
    await contracts.daoIdentity.addGroupUser(bN(3), addressOf.prl, 'prl:added');

    // register interactives
    await contracts.resolver.register_contract('dao:voting:claims', addressOf.root);
    await contracts.resolver.register_contract('dao:voting', addressOf.root);
    await contracts.resolver.register_contract('dao', addressOf.root);

    // deploy
    contracts.whitelistedContracts = [];
    contracts.whitelistedContracts.push(await MockWhitelistedContract.new('whitelisted:1'));
    contracts.whitelistedContracts.push(await MockWhitelistedContract.new('whitelisted:2'));
    contracts.daoWhitelisting = await DaoWhitelisting.new(contracts.resolver.address, [
      contracts.whitelistedContracts[0].address,
      contracts.whitelistedContracts[1].address,
    ]);
  });

  describe('initialization', function () {
    it('[verify key]', async function () {
      assert.deepEqual(await contracts.resolver.get_contract.call('dao:whitelisting'), contracts.daoWhitelisting.address);
    });
    it('[verify the initialized whitelisted contract]', async function () {
      assert.deepEqual(await contracts.daoWhitelistingStorage.whitelist.call(contracts.whitelistedContracts[0].address), true);
      assert.deepEqual(await contracts.daoWhitelistingStorage.whitelist.call(contracts.whitelistedContracts[1].address), true);
      assert.deepEqual(await contracts.daoWhitelistingStorage.whitelist.call(randomAddress()), false);
    });
  });

  describe('setWhitelisted', function () {
    it('[non-prl calls]: revert', async function () {
      assert(await a.failure(contracts.daoWhitelisting.setWhitelisted(
        randomAddress(),
        true,
        { from: accounts[4] },
      )));
      assert(await a.failure(contracts.daoWhitelisting.setWhitelisted(
        randomAddress(),
        true,
        { from: accounts[6] },
      )));
    });
    it('[prl calls]', async function () {
      const newWhitelistedContract = await MockWhitelistedContract.new('whitelisted:3');
      assert.ok(await contracts.daoWhitelisting.setWhitelisted.call(
        newWhitelistedContract.address,
        true,
        { from: addressOf.prl },
      ));
      await contracts.daoWhitelisting.setWhitelisted(
        newWhitelistedContract.address,
        true,
        { from: addressOf.prl },
      );
      assert.deepEqual(await contracts.daoWhitelistingStorage.whitelist.call(newWhitelistedContract.address), true);
    });
    it('[call functions from whitelisted contracts]', async function () {
      // setup dummy proposal and votes
      await contracts.daoStorage.addProposal(doc, proposer, fundings, finalReward, false);
      await contracts.daoStorage.addDraftVote(
        doc, addressOf.badgeHolders[0],
        true, dgdStakes[0],
      );
      await contracts.daoStorage.commitVote(
        doc,
        randomCommits[0],
        addressOf.badgeHolders[0],
        bN(0),
      );
      await contracts.daoStorage.revealVote(doc, addressOf.badgeHolders[0], true, dgdStakes[0], bN(0));

      // setup dummy special proposal and votes
      await contracts.daoSpecialStorage.addSpecialProposal(
        doc,
        proposer,
        [],
        [],
        [],
        { from: accounts[0] },
      );
      await contracts.daoSpecialStorage.commitVote(doc, randomCommits[3], addressOf.dgdHolders[0]);
      await contracts.daoSpecialStorage.revealVote(doc, addressOf.dgdHolders[0], true, bN(5));

      // call from whitelisted contracts, should go through
      assert.ok(await contracts.whitelistedContracts[0].mock_call_readVotingRoundVotes.call(
        contracts.daoStorage.address,
        doc,
        bN(0),
        addressOf.allParticipants,
      ));
      assert.ok(await contracts.whitelistedContracts[0].mock_call_readDraftVote.call(
        contracts.daoStorage.address,
        doc,
        addressOf.badgeHolders[0],
      ));
      assert.ok(await contracts.whitelistedContracts[0].mock_call_readCommitVote.call(
        contracts.daoStorage.address,
        doc,
        bN(0),
        addressOf.badgeHolders[0],
      ));
      assert.ok(await contracts.whitelistedContracts[0].mock_call_readVote.call(
        contracts.daoStorage.address,
        doc,
        bN(0),
        addressOf.badgeHolders[0],
      ));
      assert.ok(await contracts.whitelistedContracts[1].mock_call_special_readCommitVote.call(
        contracts.daoSpecialStorage.address,
        doc,
        addressOf.badgeHolders[0],
      ));
      assert.ok(await contracts.whitelistedContracts[1].mock_call_special_readVote.call(
        contracts.daoSpecialStorage.address,
        doc,
        addressOf.badgeHolders[0],
      ));

      // now blacklist the contract and try, should revert
      await contracts.daoWhitelisting.setWhitelisted(
        contracts.whitelistedContracts[0].address,
        false,
        { from: addressOf.prl },
      );
      await contracts.daoWhitelisting.setWhitelisted(
        contracts.whitelistedContracts[1].address,
        false,
        { from: addressOf.prl },
      );
      assert(await a.failure(contracts.whitelistedContracts[1].mock_call_readVotingRoundVotes.call(
        contracts.daoStorage.address,
        doc,
        bN(0),
        addressOf.allParticipants,
      )));
      assert(await a.failure(contracts.whitelistedContracts[1].mock_call_readDraftVote.call(
        contracts.daoStorage.address,
        doc,
        addressOf.badgeHolders[0],
      )));
      assert(await a.failure(contracts.whitelistedContracts[1].mock_call_readCommitVote.call(
        contracts.daoStorage.address,
        doc,
        bN(0),
        addressOf.badgeHolders[0],
      )));
      assert(await a.failure(contracts.whitelistedContracts[1].mock_call_readVote.call(
        contracts.daoStorage.address,
        doc,
        bN(0),
        addressOf.badgeHolders[0],
      )));
      assert(await a.failure(contracts.whitelistedContracts[0].mock_call_special_readCommitVote.call(
        contracts.daoSpecialStorage.address,
        doc,
        addressOf.badgeHolders[0],
      )));
      assert(await a.failure(contracts.whitelistedContracts[0].mock_call_special_readVote.call(
        contracts.daoSpecialStorage.address,
        doc,
        addressOf.badgeHolders[0],
      )));
    });
  });
});
