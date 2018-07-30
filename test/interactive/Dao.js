const a = require('awaiting');

const MockDaoFundingManager = artifacts.require('MockDaoFundingManager.sol');

const {
  deployFreshDao,
  setupParticipantsStates,
  getTestProposals,
  phaseCorrection,
  withdrawDGDs,
  getParticipants,
  addProposal,
  endorseProposal,
  updateKyc,
  printDaoDetails,
  waitFor,
  modifyProposal,
  assignVotesAndCommits,
} = require('../setup');

const {
  phases,
  getTimeToNextPhase,
  proposalStates,
  daoConstantsKeys,
  daoConstantsValues,
  getTimeInQuarter,
  getTimeLeftInQuarter,
  EMPTY_ADDRESS,
  EMPTY_BYTES,
} = require('../daoHelpers');

const {
  getBonusReputation,
} = require('../daoCalculationHelper');

const {
  randomBigNumber,
  getCurrentTimestamp,
  timeIsRecent,
  randomBytes32,
  indexRange,
  randomAddress,
  paddedHex,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;
const web3Utils = require('web3-utils');

contract('Dao', function (accounts) {
  const libs = {};
  const contracts = {};
  const addressOf = {};
  let proposals;

  const resetBeforeEach = async function () {
    await deployFreshDao(libs, contracts, addressOf, accounts, bN, web3);
    await setupParticipantsStates(web3, contracts, addressOf, bN);
    proposals = getTestProposals(bN, addressOf);
    await contracts.daoIdentity.addGroupUser(bN(3), addressOf.prl, randomBytes32());
    await contracts.daoIdentity.addGroupUser(bN(4), addressOf.kycadmin, randomBytes32());
    await updateKyc(contracts, addressOf, getParticipants(addressOf, bN));
  };

  describe('setStartOfFirstQuarter', function () {
    const startTime = randomBigNumber(bN);
    const anotherStartTime = randomBigNumber(bN);
    before(async function () {
      await resetBeforeEach();
    });
    it('[not founder]: revert', async function () {
      // addressOf.root is the founder
      for (let i = 0; i < 20; i++) {
        if (i === 3) i++;
        assert(await a.failure(contracts.dao.setStartOfFirstQuarter.call(
          startTime,
          { from: accounts[i] },
        )));
      }
    });
    it('[re-set start]: revert', async function () {
      assert(await a.failure(contracts.dao.setStartOfFirstQuarter.call(
        anotherStartTime,
        { from: addressOf.founderBadgeHolder },
      )));
    });
  });

  describe('submitPreproposal', function () {
    before(async function () {
      await resetBeforeEach();
    });
    it('[not a participant]: revert', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.dgdHolders[4]), false);
      // console.log('asd');
      // console.log(proposals[0]);
      assert(await a.failure(contracts.dao.submitPreproposal(
        proposals[0].id,
        proposals[0].versions[0].milestoneDurations,
        proposals[0].versions[0].milestoneFundings,
        proposals[0].versions[0].finalReward,
        { from: addressOf.dgdHolders[4] },
      )));
    });
    it('[if milestone durations and fundings not valid]: revert', async function () {
      // fundings and durations are unequal in length: revert
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.dgdHolders[0]), true);
      assert(await a.failure(contracts.dao.submitPreproposal(
        proposals[0].id,
        [bN(100), bN(120)],
        [bN(3 * (10 ** 18)), bN(4 * (10 ** 18)), bN(5 * (10 ** 18))],
        proposals[0].versions[0].finalReward,
        { from: addressOf.dgdHolders[0] },
      )));
      assert(await a.failure(contracts.dao.submitPreproposal(
        proposals[0].id,
        [bN(100), bN(120), bN(75)],
        [bN(3 * (10 ** 18)), bN(4 * (10 ** 18))],
        proposals[0].versions[0].finalReward,
        { from: addressOf.dgdHolders[0] },
      )));

      // total funding required crosses the ethInDao: revert
      const ethInDao = await contracts.daoFundingStorage.ethInDao.call();
      const funding1 = ethInDao.minus(bN(10 * (10 ** 18)));
      const funding2 = bN(20 * (10 ** 18));
      assert(await a.failure(contracts.dao.submitPreproposal(
        proposals[0].id,
        [bN(100), bN(120)],
        [funding1, funding2],
        proposals[0].versions[0].finalReward,
        { from: addressOf.dgdHolders[0] },
      )));
    });
    it('[during main phase, participant, but not kyc approved]: revert', async function () {
      await contracts.daoIdentity.updateKyc(
        addressOf.dgdHolders[1],
        'expired',
        bN(getCurrentTimestamp() - (3600)),
        { from: addressOf.kycadmin },
      );
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.dgdHolders[1]), true);
      assert(await a.failure(contracts.dao.submitPreproposal(
        proposals[0].id,
        proposals[0].versions[0].milestoneDurations,
        proposals[0].versions[0].milestoneFundings,
        proposals[0].versions[0].finalReward,
        { from: addressOf.dgdHolders[1] },
      )));
      // kyc approve dgdHolders[1]
      await contracts.daoIdentity.updateKyc(
        addressOf.dgdHolders[1],
        'valid for 1 month',
        bN(getCurrentTimestamp() + (3600 * 24 * 30)),
        { from: addressOf.kycadmin },
      );
    });
    it('[valid inputs]: success | verify read functions', async function () {
      await contracts.dao.submitPreproposal(
        proposals[0].id,
        proposals[0].versions[0].milestoneDurations,
        proposals[0].versions[0].milestoneFundings,
        proposals[0].versions[0].finalReward,
        { from: addressOf.dgdHolders[0] },
      );
      // add another proposal
      await contracts.dao.submitPreproposal(
        proposals[1].id,
        proposals[1].versions[0].milestoneDurations,
        proposals[1].versions[0].milestoneFundings,
        proposals[1].versions[0].finalReward,
        { from: addressOf.dgdHolders[1] },
      );
      const readProposal = await contracts.daoStorage.readProposal.call(proposals[0].id);
      assert.deepEqual(readProposal[0], proposals[0].id);
      assert.deepEqual(readProposal[1], addressOf.dgdHolders[0]);
      assert.deepEqual(readProposal[2], EMPTY_ADDRESS);
      assert.deepEqual(readProposal[3], paddedHex(web3, proposalStates().PROPOSAL_STATE_PREPROPOSAL));
      assert.deepEqual(timeIsRecent(readProposal[4], 10), true);
      assert.deepEqual(readProposal[5], bN(1));
      assert.deepEqual(readProposal[6], proposals[0].id);
    });
    it('[not main phase]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      assert(await a.failure(contracts.dao.submitPreproposal(
        proposals[1].id,
        proposals[1].versions[0].milestoneDurations,
        proposals[1].versions[0].milestoneFundings,
        proposals[1].versions[0].finalReward,
        { from: addressOf.dgdHolders[0] },
      )));
    });
    after(async function () {
      assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      // withdraw stakes
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await withdrawDGDs(web3, contracts, bN, getParticipants(addressOf, bN));
    });
  });

  describe('endorseProposal', function () {
    before(async function () {
      await resetBeforeEach();
      await addProposal(contracts, proposals[0]);
      await addProposal(contracts, proposals[1]);
    });
    it('[if not a badge participant]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.dgdHolders[1]), true);
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.dgdHolders[1]), false);
      assert(await a.failure(contracts.dao.endorseProposal.call(
        proposals[1].id,
        { from: addressOf.dgdHolders[1] },
      )));
    });
    it('[valid inputs]: success | verify read functions', async function () {
      const readProposal = await contracts.daoStorage.readProposal.call(proposals[1].id);
      const state = readProposal[3];
      assert.deepEqual(state, paddedHex(web3, proposalStates().PROPOSAL_STATE_PREPROPOSAL));
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      assert.deepEqual(await contracts.dao.endorseProposal.call(
        proposals[1].id,
        { from: addressOf.badgeHolders[0] },
      ), true);
      await contracts.dao.endorseProposal(proposals[1].id, { from: addressOf.badgeHolders[0] });

      const readProposalAfter = await contracts.daoStorage.readProposal.call(proposals[1].id);
      const endorser = readProposalAfter[2];
      const stateAfter = readProposalAfter[3];
      assert.deepEqual(stateAfter, paddedHex(web3, proposalStates().PROPOSAL_STATE_DRAFT));
      assert.deepEqual(endorser, addressOf.badgeHolders[0]);
    });
    it('[if proposal has already been endorsed]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      assert(await a.failure(contracts.dao.endorseProposal.call(
        proposals[1].id,
        { from: addressOf.badgeHolders[0] },
      )));
    });
    it('[if locking phase]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[0] });
      assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[0]), true);
      const rep = await contracts.daoPointsStorage.getReputation.call(addressOf.badgeHolders[0]);
      assert.isAtLeast(rep.toNumber(), 100);
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.badgeHolders[0]), bN(2));
      assert(await a.failure(contracts.dao.endorseProposal.call(
        proposals[1].id,
        { from: addressOf.badgeHolders[0] },
      )));
    });
    after(async function () {
      // withdraw stakes
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await withdrawDGDs(web3, contracts, bN, getParticipants(addressOf, bN));
    });
  });

  describe('modifyProposal', async function () {
    before(async function () {
      await resetBeforeEach();
      await addProposal(contracts, proposals[0]);
      await addProposal(contracts, proposals[1]);
      await endorseProposal(contracts, proposals[0]);
      await endorseProposal(contracts, proposals[1]);
    });
    it('[if not proposer]: revert', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.dgdHolders[1]), true);
      assert.deepEqual(await contracts.daoIdentityStorage.is_kyc_approved.call(addressOf.dgdHolders[1]), true);
      assert.deepEqual((await contracts.daoStorage.readProposal.call(proposals[0].id))[3], paddedHex(web3, proposalStates().PROPOSAL_STATE_DRAFT));
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      assert.notEqual(await contracts.daoStorage.readProposalProposer.call(proposals[0].id), addressOf.dgdHolders[1]);
      assert(await a.failure(contracts.dao.modifyProposal.call(
        proposals[0].id,
        proposals[0].versions[1].versionId,
        proposals[0].versions[1].milestoneDurations,
        proposals[0].versions[1].milestoneFundings,
        proposals[0].versions[1].finalReward,
        { from: addressOf.dgdHolders[1] },
      )));
    });
    it('[if proposer, but kyc approval has expired]: revert', async function () {
      // set expired kyc of dgdHolders[0]
      await contracts.daoIdentity.updateKyc(
        addressOf.dgdHolders[0],
        randomBytes32(),
        bN(getCurrentTimestamp() - 60),
        { from: addressOf.kycadmin },
      );
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      assert.deepEqual(await contracts.daoStorage.readProposalProposer.call(proposals[0].id), addressOf.dgdHolders[0]);
      assert(await a.failure(contracts.dao.modifyProposal.call(
        proposals[0].id,
        proposals[0].versions[1].versionId,
        proposals[0].versions[1].milestoneDurations,
        proposals[0].versions[1].milestoneFundings,
        proposals[0].versions[1].finalReward,
        { from: addressOf.dgdHolders[0] },
      )));
      await contracts.daoIdentity.updateKyc(
        addressOf.dgdHolders[0],
        randomBytes32(),
        bN(getCurrentTimestamp() + (3600 * 24 * 30)),
        { from: addressOf.kycadmin },
      );
    });
    it('[if milestone durations and fundings are not valid]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      assert.deepEqual(await contracts.daoStorage.readProposalProposer.call(proposals[1].id), addressOf.dgdHolders[1]);
      assert(await a.failure(contracts.dao.modifyProposal.call(
        proposals[1].id,
        proposals[1].versions[1].versionId,
        [bN(1000), bN(2000)], // length != 3
        proposals[1].versions[1].milestoneFundings,
        proposals[1].versions[1].finalReward,
        { from: addressOf.dgdHolders[1] },
      )));
    });
    it('[valid]: success | verify read functions', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await contracts.dao.modifyProposal(
        proposals[1].id,
        proposals[1].versions[1].versionId,
        proposals[1].versions[1].milestoneDurations,
        proposals[1].versions[1].milestoneFundings,
        proposals[1].versions[1].finalReward,
        { from: addressOf.dgdHolders[1] },
      );
      const readProposalVersion = await contracts.daoStorage.readProposalVersion.call(proposals[1].id, proposals[1].versions[1].versionId);
      assert.deepEqual(readProposalVersion[0], proposals[1].versions[1].versionId);
      assert.deepEqual(timeIsRecent(readProposalVersion[1], 5), true);
      assert.deepEqual(readProposalVersion[2], proposals[1].versions[1].milestoneDurations);
      assert.deepEqual(readProposalVersion[3], proposals[1].versions[1].milestoneFundings);
      assert.deepEqual(readProposalVersion[4], proposals[1].versions[1].finalReward);
      // latest version should be the updated one
      assert.deepEqual(await contracts.daoStorage.getLastProposalVersion.call(proposals[1].id), proposals[1].versions[1].versionId);
      const readProposal = await contracts.daoStorage.readProposal.call(proposals[1].id);
      assert.deepEqual(readProposal[5], bN(2));
    });
    it('[if proposal has already been finalized]: revert', async function () {
      await contracts.dao.finalizeProposal(proposals[1].id, { from: addressOf.dgdHolders[1] });
      assert(await a.failure(contracts.dao.modifyProposal(
        proposals[1].id,
        proposals[1].versions[2].versionId,
        proposals[1].versions[2].milestoneDurations,
        proposals[1].versions[2].milestoneFundings,
        proposals[1].versions[2].finalReward,
        { from: addressOf.dgdHolders[1] },
      )));
    });
    it('[if locking phase]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      assert.deepEqual(await contracts.daoStorage.readProposalProposer.call(proposals[1].id), addressOf.dgdHolders[1]);
      assert(await a.failure(contracts.dao.modifyProposal.call(
        proposals[1],
        proposals[1].versions[2].versionId,
        proposals[1].versions[2].milestoneDurations,
        proposals[1].versions[2].milestoneFundings,
        proposals[1].versions[2].finalReward,
        { from: addressOf.dgdHolders[1] },
      )));
    });
    after(async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await withdrawDGDs(web3, contracts, bN, getParticipants(addressOf, bN));
    });
  });

  describe('finalizeProposal', function () {
    before(async function () {
      await resetBeforeEach();
      await addProposal(contracts, proposals[0]);
      await addProposal(contracts, proposals[1]);
      await endorseProposal(contracts, proposals[0]);
      await endorseProposal(contracts, proposals[1]);
      await contracts.dao.modifyProposal(
        proposals[0].id,
        proposals[0].versions[1].versionId,
        proposals[0].versions[1].milestoneDurations,
        proposals[0].versions[1].milestoneFundings,
        proposals[0].versions[1].finalReward,
        { from: proposals[0].proposer },
      );

      // 5 seconds is the vote claiming deadline
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE, bN(5));
    });
    it('[if not called by proposer]: revert', async function () {
      assert.notEqual(await contracts.daoStorage.readProposalProposer.call(proposals[0].id), addressOf.dgdHolders[1]);
      assert(await a.failure(contracts.dao.finalizeProposal(
        proposals[0].id,
        { from: addressOf.dgdHolders[1] },
      )));
    });
    it('[if proposer\'s kyc has expired]: revert', async function () {
      await contracts.daoIdentity.updateKyc(
        proposals[0].proposer,
        'expiring kyc',
        bN(getCurrentTimestamp() - (3600)),
        { from: addressOf.kycadmin },
      );
      assert(await a.failure(contracts.dao.finalizeProposal(
        proposals[0].id,
        { from: proposals[0].proposer },
      )));
    });
    it('[valid finalize proposal]', async function () {
      const finalVersionBefore = (await contracts.daoStorage.readProposal.call(proposals[0].id))[7];
      const latestVersion = await contracts.daoStorage.getLastProposalVersion.call(proposals[0].id);
      await contracts.daoIdentity.updateKyc(
        proposals[0].proposer,
        'expiring kyc',
        bN(getCurrentTimestamp() + (3600 * 24 * 30)),
        { from: addressOf.kycadmin },
      );
      await contracts.dao.finalizeProposal(proposals[0].id, { from: proposals[0].proposer });
      const finalVersionAfter = (await contracts.daoStorage.readProposal.call(proposals[0].id))[7];
      assert.deepEqual(latestVersion, proposals[0].versions[1].versionId);
      assert.deepEqual(finalVersionBefore, EMPTY_BYTES);
      assert.deepEqual(finalVersionAfter, latestVersion);
    });
    it('[if already finalized, re-finalize]: revert', async function () {
      assert(await a.failure(contracts.dao.finalizeProposal(
        proposals[0].id,
        { from: proposals[0].proposer },
      )));
    });
    it('[if not enough time left in the main phase]: revert', async function () {
      const startOfDao = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      const draftVotingDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_DRAFT_VOTING_PHASE);
      const timeToLockingPhase = getTimeToNextPhase(
        getCurrentTimestamp(),
        startOfDao.toNumber(),
        lockingPhaseDuration.toNumber(),
        quarterDuration.toNumber(),
      );
      await waitFor((timeToLockingPhase + 1) - draftVotingDuration.toNumber(), addressOf, web3);
      assert(await a.failure(contracts.dao.finalizeProposal(proposals[1].id, { from: proposals[1].proposer })));
    });
    it('[if proposer is no more a participant]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      // proposals[1].proposer is no more a participant since
      // its quarter 2 and proposer has not continued participation
      assert(await a.failure(contracts.dao.finalizeProposal(proposals[1].id, { from: proposals[1].proposer })));
    });
    it('[if not enough time left in main phase for draft voting + claim deadline]: revert', async function () {
      await resetBeforeEach();
      await addProposal(contracts, proposals[0]);
      await addProposal(contracts, proposals[1]);
      await endorseProposal(contracts, proposals[0]);
      await endorseProposal(contracts, proposals[1]);
      await contracts.dao.modifyProposal(
        proposals[0].id,
        proposals[0].versions[1].versionId,
        proposals[0].versions[1].milestoneDurations,
        proposals[0].versions[1].milestoneFundings,
        proposals[0].versions[1].finalReward,
        { from: proposals[0].proposer },
      );
      // 5 seconds is the vote claiming deadline
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE, bN(5));

      const startOfDao = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      const draftVotingDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_DRAFT_VOTING_PHASE);
      const claimDeadline = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE);
      const timeToLockingPhase = getTimeToNextPhase(
        getCurrentTimestamp(),
        startOfDao.toNumber(),
        lockingPhaseDuration.toNumber(),
        quarterDuration.toNumber(),
      );
      await waitFor((timeToLockingPhase + 1) - (draftVotingDuration.toNumber() + claimDeadline.toNumber()), addressOf, web3);
      assert(await a.failure(contracts.dao.finalizeProposal(proposals[1].id, { from: proposals[1].proposer })));
    });
    after(async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      console.log('in Locking Phase');
      await printDaoDetails(bN, contracts);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      console.log('Calculated global rewards');
      await withdrawDGDs(web3, contracts, bN, getParticipants(addressOf, bN));
    });
  });

  describe('migrateToNewDao', function () {
    before(async function () {
      await resetBeforeEach();
    });
    it('[if not called by owner/root]: revert', async function () {
      const newDaoContract = randomAddress();
      const newDaoFundingManager = randomAddress();
      for (const i of indexRange(1, 20)) {
        assert(await a.failure(contracts.dao.migrateToNewDao(
          newDaoFundingManager,
          newDaoContract,
          { from: accounts[i] },
        )));
      }
    });
    it('[valid migration to a new contract]', async function () {
      const newDaoContract = randomAddress();
      const newDaoFundingManager = await MockDaoFundingManager.new(contracts.daoFundingManager.address);
      const fundsBefore = await web3.eth.getBalance(contracts.daoFundingManager.address);
      await contracts.dao.migrateToNewDao(
        newDaoFundingManager.address,
        newDaoContract,
        { from: addressOf.root },
      );
      assert.deepEqual(await contracts.daoUpgradeStorage.isReplacedByNewDao.call(), true);
      assert.deepEqual(await contracts.daoUpgradeStorage.newDaoContract.call(), newDaoContract);
      assert.deepEqual(await contracts.daoUpgradeStorage.newDaoFundingManager.call(), newDaoFundingManager.address);
      assert.deepEqual(await web3.eth.getBalance(contracts.daoFundingManager.address), bN(0));
      assert.deepEqual(await web3.eth.getBalance(newDaoFundingManager.address), fundsBefore);
    });
    it('[re-try migrating to new dao (to falsify info)]: revert', async function () {
      const newDaoContractAddress = randomAddress();
      const newDaoFundingManager = await MockDaoFundingManager.new(contracts.daoFundingManager.address);
      await web3.eth.sendTransaction({
        from: accounts[0],
        to: contracts.daoFundingManager.address,
        value: web3.toWei(1, 'ether'),
      });
      assert(await a.failure(contracts.dao.migrateToNewDao(
        newDaoFundingManager.address,
        newDaoContractAddress,
        { from: addressOf.root },
      )));
    });
  });

  describe('createSpecialProposal', function () {
    before(async function () {
      await resetBeforeEach();
    });
    it('[non-founder calls function]: revert', async function () {
      const doc = randomBytes32();
      const uintConfigs = contracts.daoConfigsStorage.readUintConfigs.call();
      uintConfigs[13] = bN(6); // make a dummy change
      for (let i = 0; i < 20; i++) {
        if (i === 3) i++;
        assert(await a.failure(contracts.dao.createSpecialProposal(
          doc,
          uintConfigs,
          [],
          [],
          { from: accounts[i] },
        )));
      }
    });
    it('[valid special proposal]: verify read functions', async function () {
      const doc = randomBytes32();
      const uintConfigs = await contracts.daoConfigsStorage.readUintConfigs.call();
      uintConfigs[13] = bN(6);
      await contracts.dao.createSpecialProposal(doc, uintConfigs, [], [], { from: addressOf.founderBadgeHolder });
      const readProposal = await contracts.daoSpecialStorage.readProposal.call(doc);
      assert.deepEqual(readProposal[0], doc);
      assert.deepEqual(readProposal[1], addressOf.founderBadgeHolder);
      assert.deepEqual(timeIsRecent(readProposal[2], 2), true);
      assert.deepEqual(readProposal[3], bN(0));
    });
    it('[in locking phase]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      const doc = randomBytes32();
      const uintConfigs = await contracts.daoConfigsStorage.readUintConfigs.call();
      uintConfigs[13] = bN(6);
      assert(await a.failure(contracts.dao.createSpecialProposal(doc, uintConfigs, [], [], { from: addressOf.founderBadgeHolder })));
    });
  });

  describe('startSpecialProposalVoting', function () {
    const doc = randomBytes32();
    before(async function () {
      await resetBeforeEach();
      const uintConfigs = await contracts.daoConfigsStorage.readUintConfigs.call();
      await contracts.dao.createSpecialProposal(doc, uintConfigs, [], [], { from: addressOf.founderBadgeHolder });
    });
    it('[if not enough time in main phase for voting to be done]: revert', async function () {
      const startOfDao = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      const specialVotingDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL);
      const timeToMainPhase = getTimeToNextPhase(
        getCurrentTimestamp(),
        startOfDao.toNumber(),
        lockingPhaseDuration.toNumber(),
        quarterDuration.toNumber(),
      );
      await waitFor((timeToMainPhase + 1) - specialVotingDuration.toNumber(), addressOf, web3);
      assert(await a.failure(contracts.dao.startSpecialProposalVoting(doc, { from: addressOf.founderBadgeHolder })));
    });
    it('[if called in locking phase]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      assert(await a.failure(contracts.dao.startSpecialProposalVoting(doc, { from: addressOf.founderBadgeHolder })));
    });
    it('[called in the main phase, enough time for entire voting]: success', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      assert.deepEqual(await contracts.daoSpecialStorage.readVotingTime.call(doc), bN(0));
      await contracts.dao.startSpecialProposalVoting(doc, { from: addressOf.founderBadgeHolder });
      assert.deepEqual(timeIsRecent(await contracts.daoSpecialStorage.readVotingTime.call(doc), 2), true);
    });
  });

  describe('voteOnDraft', function () {
    before(async function () {
      await resetBeforeEach();
      await addProposal(contracts, proposals[0]);
      await addProposal(contracts, proposals[1]);
      await endorseProposal(contracts, proposals[0]);
      await endorseProposal(contracts, proposals[1]);
      await modifyProposal(contracts, proposals[0], 1);
    });
    it('[if latest proposal version is not finalized]: revert', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[0]), true);
      assert(await a.failure(contracts.daoVoting.voteOnDraft(
        proposals[0].id,
        true,
        { from: addressOf.badgeHolders[0] },
      )));
      // finalize the proposal
      await contracts.dao.finalizeProposal(proposals[0].id, { from: proposals[0].proposer });
      await contracts.dao.finalizeProposal(proposals[1].id, { from: proposals[1].proposer });
    });
    it('[if not a moderator for that quarter]: revert', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.dgdHolders[0]), false);
      assert(await a.failure(contracts.daoVoting.voteOnDraft(
        proposals[0].id,
        true,
        { from: addressOf.dgdHolders[0] },
      )));
    });
    it('[valid vote]: success | verify read functions', async function () {
      const currentQuarterIndex = bN(1);
      const qpBefore0 = await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[0], currentQuarterIndex);
      const qpBefore1 = await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[1], currentQuarterIndex);

      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await contracts.daoVoting.voteOnDraft(
        proposals[0].id,
        true,
        { from: addressOf.badgeHolders[0] },
      );
      await contracts.daoVoting.voteOnDraft(
        proposals[0].id,
        true,
        { from: addressOf.badgeHolders[1] },
      );
      await contracts.daoVoting.voteOnDraft(
        proposals[1].id,
        false,
        { from: addressOf.badgeHolders[0] },
      );
      await contracts.daoVoting.voteOnDraft(
        proposals[1].id,
        false,
        { from: addressOf.badgeHolders[1] },
      );

      // read draft vote
      const readDraftVote00 = await contracts.daoStorage.readDraftVote.call(proposals[0].id, addressOf.badgeHolders[0]);
      const readDraftVote01 = await contracts.daoStorage.readDraftVote.call(proposals[0].id, addressOf.badgeHolders[1]);
      const readDraftVote10 = await contracts.daoStorage.readDraftVote.call(proposals[1].id, addressOf.badgeHolders[0]);
      const readDraftVote11 = await contracts.daoStorage.readDraftVote.call(proposals[1].id, addressOf.badgeHolders[1]);
      const participants = getParticipants(addressOf, bN);

      assert.deepEqual(readDraftVote00[0], true);
      assert.deepEqual(readDraftVote00[1], participants[0].dgdToLock);

      assert.deepEqual(readDraftVote01[0], true);
      assert.deepEqual(readDraftVote01[1], participants[1].dgdToLock);

      assert.deepEqual(readDraftVote10[0], false);
      assert.deepEqual(readDraftVote10[1], participants[0].dgdToLock);

      assert.deepEqual(readDraftVote11[0], false);
      assert.deepEqual(readDraftVote11[1], participants[1].dgdToLock);

      // read draft voting count
      const count0 = await contracts.daoStorage.readDraftVotingCount.call(proposals[0].id, addressOf.allParticipants);
      const count1 = await contracts.daoStorage.readDraftVotingCount.call(proposals[1].id, addressOf.allParticipants);
      assert.deepEqual(count0[0], participants[0].dgdToLock.plus(participants[1].dgdToLock));
      assert.deepEqual(count0[1], bN(0));
      assert.deepEqual(count1[0], bN(0));
      assert.deepEqual(count1[1], participants[0].dgdToLock.plus(participants[1].dgdToLock));

      // read quarter points
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[0], currentQuarterIndex),
        qpBefore0.plus(daoConstantsValues(bN).CONFIG_QUARTER_POINT_DRAFT_VOTE.times(bN(2))),
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[1], currentQuarterIndex),
        qpBefore1.plus(daoConstantsValues(bN).CONFIG_QUARTER_POINT_DRAFT_VOTE.times(bN(2))),
      );
    });
    it('[modify votes]: success | verify read functions', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      const currentQuarterIndex = bN(1);
      const qpBefore0 = await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[0], currentQuarterIndex);
      const qpBefore1 = await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[1], currentQuarterIndex);

      await contracts.daoVoting.voteOnDraft(
        proposals[0].id,
        false,
        { from: addressOf.badgeHolders[0] },
      );
      await contracts.daoVoting.voteOnDraft(
        proposals[1].id,
        true,
        { from: addressOf.badgeHolders[1] },
      );

      // read draft vote
      const readDraftVote0 = await contracts.daoStorage.readDraftVote.call(proposals[0].id, addressOf.badgeHolders[0]);
      const readDraftVote1 = await contracts.daoStorage.readDraftVote.call(proposals[1].id, addressOf.badgeHolders[1]);

      assert.deepEqual(readDraftVote0[0], false);

      assert.deepEqual(readDraftVote1[0], true);

      // read draft voting count
      const participants = getParticipants(addressOf, bN);
      const count0 = await contracts.daoStorage.readDraftVotingCount.call(proposals[0].id, addressOf.allParticipants);
      const count1 = await contracts.daoStorage.readDraftVotingCount.call(proposals[1].id, addressOf.allParticipants);
      assert.deepEqual(count0[0], participants[1].dgdToLock); // is for
      assert.deepEqual(count0[1], participants[0].dgdToLock); // is against
      assert.deepEqual(count1[0], participants[1].dgdToLock);
      assert.deepEqual(count1[1], participants[0].dgdToLock);

      assert.deepEqual(await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[0], currentQuarterIndex), qpBefore0);
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[1], currentQuarterIndex), qpBefore1);

      // now vote back true so that proposals[0] can pass
      await contracts.daoVoting.voteOnDraft(
        proposals[0].id,
        true,
        { from: addressOf.badgeHolders[0] },
      );
    });
    it('[vote after draft voting phase is over]: revert', async function () {
      const draftVotingDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_DRAFT_VOTING_PHASE);
      await waitFor(draftVotingDuration.toNumber(), addressOf, web3);
      assert.deepEqual(await contracts.daoStakeLocking.isMainPhase.call(), true);
      assert(await a.failure(contracts.daoVoting.voteOnDraft(
        proposals[1].id,
        true,
        { from: proposals[1].proposer },
      )));
    });
    after(async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
    });
  });

  describe('claimDraftVotingResult', function () {
    before(async function () {
      // need moderators to confirm participation in this quarter
      // await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[0] });
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.badgeHolders[1] });
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolders[0] });
      await contracts.daoStakeLocking.confirmContinuedParticipation({ from: addressOf.dgdHolders[1] });
    });
    it('[if locking phase]: revert', async function () {
      const voteCount0 = await contracts.daoStorage.readDraftVotingCount.call(proposals[0].id, addressOf.allParticipants);
      const minimumDraftQuorum = await contracts.daoCalculatorService.minimumDraftQuorum.call(proposals[0].id);
      assert.isAtLeast(voteCount0[2].toNumber(), minimumDraftQuorum.toNumber());
      assert.deepEqual(await contracts.daoCalculatorService.draftQuotaPass.call(voteCount0[0], voteCount0[1]), true);
      assert(await a.failure(contracts.daoVotingClaims.claimDraftVotingResult.call(proposals[0].id, { from: proposals[0].proposer })));
    });
    it('[if non-proposer claims]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);

      // proposals[0].proposer == addressOf.dgdHolders[0]
      assert(await a.failure(contracts.daoVotingClaims.claimDraftVotingResult.call(proposals[0].id, { from: addressOf.badgeHolders[0] })));
      assert(await a.failure(contracts.daoVotingClaims.claimDraftVotingResult.call(proposals[0].id, { from: addressOf.badgeHolders[1] })));
      assert(await a.failure(contracts.daoVotingClaims.claimDraftVotingResult.call(proposals[0].id, { from: addressOf.dgdHolders[1] })));
    });
    it('[if voting before draft voting phase ends | quorum is not met]: revert', async function () {
      // add proposals
      await addProposal(contracts, proposals[2]);
      await addProposal(contracts, proposals[3]);
      await endorseProposal(contracts, proposals[2]);
      await endorseProposal(contracts, proposals[3]);
      await contracts.dao.finalizeProposal(proposals[2].id, { from: proposals[2].proposer });
      await contracts.dao.finalizeProposal(proposals[3].id, { from: proposals[3].proposer });

      // draft vote on them
      // proposals[2] => quorum pass, quota fails
      // proposals[3] => quorum fails
      await contracts.daoVoting.voteOnDraft(
        proposals[2].id,
        true,
        { from: addressOf.badgeHolders[0] },
      );
      await contracts.daoVoting.voteOnDraft(
        proposals[2].id,
        true,
        { from: addressOf.badgeHolders[1] },
      );

      // proposals[2] should pass, but its not yet end of draft voting phase
      assert(await a.failure(contracts.daoVotingClaims.claimDraftVotingResult.call(proposals[2].id, { from: proposals[2].proposer })));

      // now change the votes
      await contracts.daoVoting.voteOnDraft(
        proposals[2].id,
        false,
        { from: addressOf.badgeHolders[0] },
      );
      await contracts.daoVoting.voteOnDraft(
        proposals[2].id,
        false,
        { from: addressOf.badgeHolders[1] },
      );

      // wait for draft voting phase to get over
      const draftVotingDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_DRAFT_VOTING_PHASE);
      await waitFor(draftVotingDuration.toNumber(), addressOf, web3);

      const voteCount3 = await contracts.daoStorage.readDraftVotingCount.call(proposals[3].id, addressOf.allParticipants);
      const minimumDraftQuorum = await contracts.daoCalculatorService.minimumDraftQuorum.call(proposals[3].id);
      assert.isBelow(voteCount3[2].toNumber(), minimumDraftQuorum.toNumber());
      assert(await a.failure(contracts.daoVotingClaims.claimDraftVotingResult.call(proposals[3].id, { from: proposals[3].proposer })));
    });
    it('[if quota is not met]: revert', async function () {
      const voteCount2 = await contracts.daoStorage.readDraftVotingCount.call(proposals[2].id, addressOf.allParticipants);
      const minimumDraftQuorum = await contracts.daoCalculatorService.minimumDraftQuorum.call(proposals[2].id);
      assert.isAtLeast(voteCount2[2].toNumber(), minimumDraftQuorum.toNumber());
      assert.deepEqual(await contracts.daoCalculatorService.draftQuotaPass.call(voteCount2[0], voteCount2[1]), false);
      assert(await a.failure(contracts.daoVotingClaims.claimDraftVotingResult.call(proposals[2].id, { from: proposals[2].proposer })));
    });
    it('[valid claim, quorum quota both passed]: verify read functions', async function () {
      await resetBeforeEach();
      await addProposal(contracts, proposals[0]);
      await endorseProposal(contracts, proposals[0]);
      await modifyProposal(contracts, proposals[0], 1);
      await contracts.dao.finalizeProposal(proposals[0].id, { from: proposals[0].proposer });
      const participants = getParticipants(addressOf, bN);
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(0),
        true,
        [addressOf.badgeHolders[0], addressOf.badgeHolders[1], addressOf.dgdHolders[0], addressOf.dgdHolders[1]],
        [true, true, true, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(0),
      );

      // wait for draft voting phase to end
      await waitFor(bN(6), addressOf, web3);

      const voteCount0 = await contracts.daoStorage.readDraftVotingCount.call(proposals[0].id, addressOf.allParticipants);
      const minimumDraftQuorum = await contracts.daoCalculatorService.minimumDraftQuorum.call(proposals[2].id);
      assert.isAtLeast(voteCount0[2].toNumber(), minimumDraftQuorum.toNumber());
      assert.deepEqual(await contracts.daoCalculatorService.draftQuotaPass.call(voteCount0[0], voteCount0[1]), true);
      assert.deepEqual(await contracts.daoStorage.readProposalDraftVotingResult.call(proposals[0].id), false);

      // conditions met, claim the draft voting results
      assert.deepEqual(await contracts.daoVotingClaims.claimDraftVotingResult.call(proposals[0].id, bN(50), { from: proposals[0].proposer }), true);
      await contracts.daoVotingClaims.claimDraftVotingResult(proposals[0].id, bN(50), { from: proposals[0].proposer });

      // draft voting result set
      assert.deepEqual(await contracts.daoStorage.readProposalDraftVotingResult.call(proposals[0].id), true);

      // voting time is set
      const draftVotingStart = await contracts.daoStorage.readProposalDraftVotingTime.call(proposals[0].id);
      const draftVotingDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_DRAFT_VOTING_PHASE);
      const timeNow = draftVotingStart.toNumber() + draftVotingDuration.toNumber();
      const startOfDao = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      const timeToLockingPhase = getTimeToNextPhase(timeNow, startOfDao.toNumber(), lockingPhaseDuration.toNumber(), quarterDuration.toNumber());
      const votingRoundDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTING_PHASE_TOTAL);
      const claimDeadline = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE);
      let idealVotingTime;
      if (timeToLockingPhase < (votingRoundDuration.plus(claimDeadline)).toNumber()) {
        idealVotingTime = timeNow + timeToLockingPhase + lockingPhaseDuration.toNumber();
      } else {
        idealVotingTime = timeNow;
      }
      assert.deepEqual(await contracts.daoStorage.readProposalVotingTime.call(proposals[0].id, bN(0)), bN(idealVotingTime));

      // claimer is set
      assert.deepEqual(await contracts.daoStorage.isDraftClaimed.call(proposals[0].id), true);
    });
    it('[claim a voting already claimed]: revert', async function () {
      assert(await a.failure(contracts.daoVotingClaims.claimDraftVotingResult(
        proposals[0].id,
        bN(50),
        { from: proposals[0].proposer },
      )));
    });
  });

  describe('commitVoteOnProposal', function () {
    let votesAndCommits;
    let startTime;
    before(async function () {
      await resetBeforeEach();
      // in the voting phase
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[0].id,
        bN(0),
        false,
        proposals[0].proposer,
        proposals[0].endorser,
        proposals[0].versions[0].milestoneDurations,
        proposals[0].versions[0].milestoneFundings,
        proposals[0].versions[0].finalReward,
      );
      startTime = getCurrentTimestamp();
      // in the voting phase
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[1].id,
        bN(0),
        false,
        proposals[1].proposer,
        proposals[1].endorser,
        proposals[1].versions[0].milestoneDurations,
        proposals[1].versions[0].milestoneFundings,
        proposals[1].versions[0].finalReward,
      );
      // in the draft phase
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[2].id,
        bN(0),
        true,
        proposals[2].proposer,
        proposals[2].endorser,
        proposals[2].versions[0].milestoneDurations,
        proposals[2].versions[0].milestoneFundings,
        proposals[2].versions[0].finalReward,
      );
      // in the interim commit phase
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[3].id,
        bN(1),
        false,
        proposals[3].proposer,
        proposals[3].endorser,
        proposals[3].versions[0].milestoneDurations,
        proposals[3].versions[0].milestoneFundings,
        proposals[3].versions[0].finalReward,
      );
      votesAndCommits = assignVotesAndCommits(addressOf);
    });
    it('[if invalid proposal state for voting round]: revert', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.allParticipants[0]), true);
      assert(await a.failure(contracts.daoVoting.commitVoteOnProposal(
        proposals[2].id,
        bN(0),
        votesAndCommits.votingCommits[2][0],
        { from: addressOf.allParticipants[0] },
      )));
    });
    it('[if called by non-participant]: revert', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.allParticipants[2]), false);
      assert(await a.failure(contracts.daoVoting.commitVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votingCommits[0][2],
        { from: addressOf.allParticipants[2] },
      )));
    });
    it('[valid commit vote]: verify read functions', async function () {
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votingCommits[0][0],
        { from: addressOf.allParticipants[0] },
      );
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[1].id,
        bN(0),
        votesAndCommits.votingCommits[1][1],
        { from: addressOf.allParticipants[1] },
      );
      assert.deepEqual(await contracts.daoStorage.readCommitVote.call(proposals[0].id, bN(0), addressOf.allParticipants[0]), votesAndCommits.votingCommits[0][0]);
      assert.deepEqual(await contracts.daoStorage.readCommitVote.call(proposals[1].id, bN(0), addressOf.allParticipants[1]), votesAndCommits.votingCommits[1][1]);

      // commit vote interim round
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[3].id,
        bN(1),
        votesAndCommits.votingCommits[3][0],
        { from: addressOf.allParticipants[0] },
      );
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[3].id,
        bN(1),
        votesAndCommits.votingCommits[3][1],
        { from: addressOf.allParticipants[1] },
      );
    });
    it('[update commit vote valid]: verify read functions', async function () {
      const randomSaltPrime = randomBigNumber(bN);
      const commitPrime = web3Utils.soliditySha3(
        { t: 'address', v: addressOf.allParticipants[0] },
        { t: 'bool', v: false },
        { t: 'uint256', v: randomSaltPrime },
      );
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[0].id,
        bN(0),
        commitPrime,
        { from: addressOf.allParticipants[0] },
      );
      assert.deepEqual(await contracts.daoStorage.readCommitVote.call(proposals[0].id, bN(0), addressOf.allParticipants[0]), commitPrime);
    });
    it('[if not voting commit phase]: revert', async function () {
      // wait for commit phase to get over
      const commitPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTING_COMMIT_PHASE);
      const timeToWaitFor = commitPhaseDuration.toNumber() - (getCurrentTimestamp() - startTime);
      await waitFor(timeToWaitFor, addressOf, web3);
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.allParticipants[4]), true);
      assert(await a.failure(contracts.daoVoting.commitVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votingCommits[0][4],
        { from: addressOf.allParticipants[4] },
      )));
    });
  });

  describe('revealVoteOnProposal', function () {
    let votesAndCommits;
    let startTime;
    before(async function () {
      await resetBeforeEach();
      // in the voting phase
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[0].id,
        bN(0),
        false,
        proposals[0].proposer,
        proposals[0].endorser,
        proposals[0].versions[0].milestoneDurations,
        proposals[0].versions[0].milestoneFundings,
        proposals[0].versions[0].finalReward,
      );
      startTime = getCurrentTimestamp();
      // in the voting phase
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[1].id,
        bN(0),
        false,
        proposals[1].proposer,
        proposals[1].endorser,
        proposals[1].versions[0].milestoneDurations,
        proposals[1].versions[0].milestoneFundings,
        proposals[1].versions[0].finalReward,
      );
      // in the draft phase
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[2].id,
        bN(0),
        true,
        proposals[2].proposer,
        proposals[2].endorser,
        proposals[2].versions[0].milestoneDurations,
        proposals[2].versions[0].milestoneFundings,
        proposals[2].versions[0].finalReward,
      );
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[3].id,
        bN(1),
        false,
        proposals[3].proposer,
        proposals[3].endorser,
        proposals[3].versions[0].milestoneDurations,
        proposals[3].versions[0].milestoneFundings,
        proposals[3].versions[0].finalReward,
      );
      votesAndCommits = assignVotesAndCommits(addressOf);
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votingCommits[0][0],
        { from: addressOf.allParticipants[0] },
      );
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votingCommits[0][1],
        { from: addressOf.allParticipants[1] },
      );
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votingCommits[0][4],
        { from: addressOf.allParticipants[4] },
      );
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[3].id,
        bN(1),
        votesAndCommits.votingCommits[3][0],
        { from: addressOf.allParticipants[0] },
      );
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[3].id,
        bN(1),
        votesAndCommits.votingCommits[3][1],
        { from: addressOf.allParticipants[1] },
      );
    });
    it('[if not the voting reveal phase]: revert', async function () {
      // before the reveal phase begins, reveal the correct vote
      assert(await a.failure(contracts.daoVoting.revealVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votes[0][0],
        votesAndCommits.salts[0][0],
        { from: addressOf.allParticipants[0] },
      )));
      assert(await a.failure(contracts.daoVoting.revealVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votes[0][1],
        votesAndCommits.salts[0][1],
        { from: addressOf.allParticipants[1] },
      )));
    });
    it('[if non-participant calls]: revert', async function () {
      // now wait for the phase to be over
      const commitPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTING_COMMIT_PHASE);
      const timeToWaitFor = commitPhaseDuration.toNumber() - (getCurrentTimestamp() - startTime);
      await waitFor(timeToWaitFor + 2, addressOf, web3);

      // mock remove user as participant
      await contracts.daoRewardsStorage.mock_set_last_participated_quarter(addressOf.allParticipants[1], bN(0));
      assert(await a.failure(contracts.daoVoting.revealVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votes[0][1],
        votesAndCommits.salts[0][1],
        { from: addressOf.allParticipants[1] },
      )));
    });
    it('[revealed vote cannot verify last commit]: revert', async function () {
      // add back the user
      await contracts.daoRewardsStorage.mock_set_last_participated_quarter(addressOf.allParticipants[1], bN(1));
      // reveal the wrong vote
      assert(await a.failure(contracts.daoVoting.revealVoteOnProposal(
        proposals[0].id,
        bN(0),
        !votesAndCommits.votes[0][1],
        votesAndCommits.salts[0][1],
        { from: addressOf.allParticipants[1] },
      )));

      // reveal the wrong salt
      assert(await a.failure(contracts.daoVoting.revealVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votes[0][1],
        randomBigNumber(bN),
        { from: addressOf.allParticipants[1] },
      )));
    });
    it('[reveal successfully]: verify read functions', async function () {
      // read info before
      const quarterIndex = bN(1);
      const qpBefore0 = await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.allParticipants[0], quarterIndex);
      const qpBefore1 = await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.allParticipants[1], quarterIndex);

      // reveal correctly
      await contracts.daoVoting.revealVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votes[0][1],
        votesAndCommits.salts[0][1],
        { from: addressOf.allParticipants[1] },
      );
      await contracts.daoVoting.revealVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votes[0][0],
        votesAndCommits.salts[0][0],
        { from: addressOf.allParticipants[0] },
      );

      // read vote
      const participants = getParticipants(addressOf, bN);
      const readVote0 = await contracts.daoStorage.readVote.call(proposals[0].id, bN(0), addressOf.allParticipants[0]);
      const readVote1 = await contracts.daoStorage.readVote.call(proposals[0].id, bN(0), addressOf.allParticipants[1]);
      assert.deepEqual(readVote0[0], votesAndCommits.votes[0][0]);
      assert.deepEqual(readVote1[0], votesAndCommits.votes[0][1]);
      assert.deepEqual(readVote0[1], participants[0].dgdToLock);
      assert.deepEqual(readVote1[1], participants[1].dgdToLock);

      // check quarter point
      const additionQP = daoConstantsValues(bN).CONFIG_QUARTER_POINT_VOTE;
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.allParticipants[0], quarterIndex), qpBefore0.plus(additionQP));
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.allParticipants[1], quarterIndex), qpBefore1.plus(additionQP));

      await contracts.daoVoting.revealVoteOnProposal(
        proposals[3].id,
        bN(1),
        votesAndCommits.votes[3][0],
        votesAndCommits.salts[3][0],
        { from: addressOf.allParticipants[0] },
      );
      await contracts.daoVoting.revealVoteOnProposal(
        proposals[3].id,
        bN(1),
        votesAndCommits.votes[3][1],
        votesAndCommits.salts[3][1],
        { from: addressOf.allParticipants[1] },
      );

      const readInterimVote0 = await contracts.daoStorage.readVote.call(proposals[3].id, bN(1), addressOf.allParticipants[0]);
      const readInterimVote1 = await contracts.daoStorage.readVote.call(proposals[3].id, bN(1), addressOf.allParticipants[1]);
      assert.deepEqual(readInterimVote0[0], votesAndCommits.votes[3][0]);
      assert.deepEqual(readInterimVote1[0], votesAndCommits.votes[3][1]);
    });
    it('[revealing vote again]: revert', async function () {
      assert(await a.failure(contracts.daoVoting.revealVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votes[0][0],
        votesAndCommits.salts[0][0],
        { from: addressOf.allParticipants[0] },
      )));
    });
  });

  describe('claimVotingResult', function () {
    let participants;
    beforeEach(async function () {
      await resetBeforeEach();
      participants = getParticipants(addressOf, bN);
      /**
        proposals[0] in interim voting round
        allParticipants[0], [1] vote for, [4], [5] vote against during voting round
        allParticipants vote for in the interim round
        bonus should be given only to allParticipants[0] and [1]
      */
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[0].id,
        bN(1),
        false,
        proposals[0].proposer,
        proposals[0].endorser,
        proposals[0].versions[0].milestoneDurations,
        proposals[0].versions[0].milestoneFundings,
        proposals[0].versions[0].finalReward,
      );
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(0),
        false,
        [addressOf.allParticipants[0], addressOf.allParticipants[1], addressOf.allParticipants[4], addressOf.allParticipants[5]],
        [true, true, false, false],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp()).minus(proposals[0].versions[0].milestoneDurations[0]),
      );
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(1),
        false,
        [addressOf.allParticipants[0], addressOf.allParticipants[1], addressOf.allParticipants[4], addressOf.allParticipants[5]],
        [true, true, true, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp() + 20),
      );

      /**
        proposals[1] in interim voting round
        check when time left is less than interim voting duration
      */
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[1].id,
        bN(1),
        false,
        proposals[1].proposer,
        proposals[1].endorser,
        proposals[1].versions[0].milestoneDurations,
        proposals[1].versions[0].milestoneFundings,
        proposals[1].versions[0].finalReward,
      );
      await contracts.daoStorage.mock_put_past_votes(
        proposals[1].id,
        bN(0),
        false,
        [addressOf.allParticipants[0], addressOf.allParticipants[1], addressOf.allParticipants[4], addressOf.allParticipants[5]],
        [true, true, false, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp()).minus(proposals[1].versions[0].milestoneDurations[0]),
      );
      await contracts.daoStorage.mock_put_past_votes(
        proposals[1].id,
        bN(1),
        false,
        [addressOf.allParticipants[0], addressOf.allParticipants[1], addressOf.allParticipants[4], addressOf.allParticipants[5]],
        [true, true, false, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp() + 20),
      );

      /**
        proposals[2] in voting round
        quota is not satisfied although quorum is met
      */
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[2].id,
        bN(0),
        false,
        proposals[2].proposer,
        proposals[2].endorser,
        proposals[2].versions[0].milestoneDurations,
        proposals[2].versions[0].milestoneFundings,
        proposals[2].versions[0].finalReward,
      );
      await contracts.daoStorage.mock_put_past_votes(
        proposals[2].id,
        bN(0),
        false,
        [addressOf.allParticipants[0], addressOf.allParticipants[1], addressOf.allParticipants[4], addressOf.allParticipants[5]],
        [false, false, false, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp() + 20),
      );
    });
    it('[if claiming before reveal phase ends]: revert', async function () {
      assert(await a.failure(contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[0].id,
        bN(1),
        { from: proposals[0].proposer },
      )));
    });
    it('[if non-proposer claims]: revert', async function () {
      // now wait for the interim phase to get over
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);

      await a.map(indexRange(1, 6), 20, async (i) => {
        if (addressOf.allParticipants[i] === proposals[0].proposer) return;
        assert(await a.failure(contracts.daoVotingClaims.claimProposalVotingResult(
          proposals[0].id,
          bN(1),
          { from: addressOf.allParticipants[i] },
        )));
        if (addressOf.allParticipants[i] === proposals[1].proposer) return;
        assert(await a.failure(contracts.daoVotingClaims.claimProposalVotingResult(
          proposals[1].id,
          bN(1),
          { from: addressOf.allParticipants[i] },
        )));
      });
    });
    it('[voting round - if quota is not met]: returns false', async function () {
      // now wait for the interim phase to get over
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);

      assert.deepEqual(await contracts.daoStorage.isClaimed.call(proposals[2].id, bN(0)), false);

      const claimRes = await contracts.daoVotingClaims.claimProposalVotingResult.call(
        proposals[2].id,
        bN(0),
        bN(10),
        { from: proposals[2].proposer },
      );
      assert.deepEqual(claimRes[0], false);
      assert.deepEqual(claimRes[1], true); // claim process done
      await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[2].id,
        bN(0),
        bN(10),
        { from: proposals[2].proposer },
      );

      assert.deepEqual(await contracts.daoFundingStorage.claimableEth.call(proposals[2].proposer), bN(0));
      assert.deepEqual(await contracts.daoStorage.isClaimed.call(proposals[2].id, bN(0)), true);
    });
    it('[valid claim]: verify read functions', async function () {
      // now wait for the interim phase to get over
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);

      // values before claiming
      const qpBefore0 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[0]);
      const qpBefore1 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[1]);
      const qpBefore4 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[4]);
      const qpBefore5 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[5]);
      const claimableEthBefore = await contracts.daoFundingStorage.claimableEth.call(proposals[0].proposer);

      // claim the result
      await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[0].id,
        bN(1),
        bN(10),
        { from: proposals[0].proposer },
      );

      // voting result set
      assert.deepEqual(await contracts.daoStorage.readProposalVotingResult.call(proposals[0].id, bN(1)), true);

      // next interim voting time is set
      const nextInterimVotingTime = await contracts.daoStorage.readProposalVotingTime.call(proposals[0].id, bN(2));
      const nextMilestoneStartTime = await contracts.daoStorage.readProposalNextMilestoneStart.call(proposals[0].id, bN(2));
      const startOfDao = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      const nextMilestoneDuration = proposals[0].versions[0].milestoneDurations[1];
      const startOfThisMilestone = await contracts.daoStorage.readProposalNextMilestoneStart.call(proposals[0].id, bN(1));
      let nextVotingTime = startOfThisMilestone.toNumber() + nextMilestoneDuration.toNumber();
      if (getTimeInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber()) < lockingPhaseDuration.toNumber()) {
        nextVotingTime += (lockingPhaseDuration.toNumber() - getTimeInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber())) + 1;
      } else if (getTimeLeftInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber()) < interimVotingPhaseDuration.toNumber()) {
        nextVotingTime += getTimeLeftInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber()) + lockingPhaseDuration.toNumber() + 1;
      }
      assert.deepEqual(nextInterimVotingTime, bN(nextVotingTime));
      assert.deepEqual(nextMilestoneStartTime, bN(nextVotingTime).plus(interimVotingPhaseDuration));

      // claimed is set
      assert.deepEqual(await contracts.daoStorage.isClaimed.call(proposals[0].id, bN(1)), true);

      // claimable updated
      assert.deepEqual(await contracts.daoFundingStorage.claimableEth.call(proposals[0].proposer), claimableEthBefore.plus(proposals[0].versions[0].milestoneFundings[1]));

      // check bonus reputation awarded
      const bonusRP = getBonusReputation(
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_VOTE,
        daoConstantsValues(bN).CONFIG_BONUS_REPUTATION_NUMERATOR,
        daoConstantsValues(bN).CONFIG_BONUS_REPUTATION_DENOMINATOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_NUM,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_DEN,
      );
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[4]), qpBefore4);
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[5]), qpBefore5);
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[0]), qpBefore0.plus(bN(bonusRP)));
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[1]), qpBefore1.plus(bN(bonusRP)));
    });
    it('[if milestone 1 time ends around the LOCKING_PHASE, interim voting should be pushed to start of MAIN_PHASE]: verify', async function () {
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);

      // values before claiming
      const qpBefore0 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[0]);
      const qpBefore1 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[1]);
      const qpBefore4 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[4]);
      const qpBefore5 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[5]);

      await contracts.daoVotingClaims.claimProposalVotingResult(proposals[1].id, bN(1), bN(10), { from: proposals[1].proposer });

      // next interim voting time is set
      const nextInterimVotingTime = await contracts.daoStorage.readProposalVotingTime.call(proposals[1].id, bN(2));
      const nextMilestoneStartTime = await contracts.daoStorage.readProposalNextMilestoneStart.call(proposals[1].id, bN(2));
      const startOfDao = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      const nextMilestoneDuration = proposals[1].versions[0].milestoneDurations[1];
      const startOfThisMilestone = await contracts.daoStorage.readProposalNextMilestoneStart.call(proposals[1].id, bN(1));
      let nextVotingTime = startOfThisMilestone.toNumber() + nextMilestoneDuration.toNumber();
      if (getTimeInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber()) < lockingPhaseDuration.toNumber()) {
        console.log('it lies in the locking phase, should be pushed ahead to main phase');
        nextVotingTime += (lockingPhaseDuration.toNumber() - getTimeInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber())) + 1;
      } else if (getTimeLeftInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber()) < (interimVotingPhaseDuration.toNumber() + daoConstantsValues(bN).CONFIG_VOTE_CLAIMING_DEADLINE.toNumber())) {
        console.log('it lies in main phase, but not enough time for voting round, should be pushed to the next main phase');
        nextVotingTime += getTimeLeftInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber()) + lockingPhaseDuration.toNumber() + 1;
      }
      assert.deepEqual(nextInterimVotingTime, bN(nextVotingTime));
      assert.deepEqual(nextMilestoneStartTime, bN(nextVotingTime).plus(interimVotingPhaseDuration));

      // check bonus reputation awarded
      const bonusRP = getBonusReputation(
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_VOTE,
        daoConstantsValues(bN).CONFIG_BONUS_REPUTATION_NUMERATOR,
        daoConstantsValues(bN).CONFIG_BONUS_REPUTATION_DENOMINATOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_NUM,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_DEN,
      );
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[4]), qpBefore4);
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[5]), qpBefore5.plus(bN(bonusRP)));
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[0]), qpBefore0.plus(bN(bonusRP)));
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[1]), qpBefore1.plus(bN(bonusRP)));
    });
    it('[final interim round, release final reward]', async function () {
      /**
        proposals[3] completed last milestone
        final interim round to release finalReward
        everybody votes true, allParticipants[3] voted false in previous round
      */
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[3].id,
        bN(4),
        false,
        proposals[3].proposer,
        proposals[3].endorser,
        proposals[3].versions[0].milestoneDurations,
        proposals[3].versions[0].milestoneFundings,
        proposals[3].versions[0].finalReward,
      );
      await contracts.daoStorage.mock_put_past_votes(
        proposals[3].id,
        bN(3),
        false,
        [addressOf.allParticipants[0], addressOf.allParticipants[1], addressOf.allParticipants[4], addressOf.allParticipants[5]],
        [true, true, true, false],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp() + 20),
      );
      await contracts.daoStorage.mock_put_past_votes(
        proposals[3].id,
        bN(4),
        false,
        [addressOf.allParticipants[0], addressOf.allParticipants[1], addressOf.allParticipants[4], addressOf.allParticipants[5]],
        [true, true, true, false],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp() + 40),
      );

      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);

      const claimableEthBefore = await contracts.daoFundingStorage.claimableEth.call(proposals[3].proposer);
      const qpBefore = await contracts.daoPointsStorage.getQuarterPoint.call(proposals[3].proposer, bN(1));

      await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[3].id,
        bN(4),
        bN(10),
        { from: proposals[3].proposer },
      );

      assert(await contracts.daoFundingStorage.claimableEth.call(proposals[3].proposer), claimableEthBefore.plus(proposals[3].versions[0].finalReward));
      assert(await contracts.daoPointsStorage.getQuarterPoint.call(proposals[3].proposer, bN(1)), qpBefore.plus(daoConstantsValues(bN).CONFIG_QUARTER_POINT_MILESTONE_COMPLETION_PER_10000ETH));
    });
    it('[re-claim same voting round]: revert', async function () {
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);
      await contracts.daoVotingClaims.claimProposalVotingResult(proposals[0].id, bN(1), bN(10), { from: proposals[0].proposer });
      await contracts.daoVotingClaims.claimProposalVotingResult(proposals[1].id, bN(1), bN(10), { from: proposals[1].proposer });

      assert(await a.failure(contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[0].id,
        bN(1),
        bN(10),
        { from: proposals[0].proposer },
      )));
      assert(await a.failure(contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[1].id,
        bN(1),
        bN(10),
        { from: proposals[1].proposer },
      )));
    });
    it('[trying to claim after the claim deadline]: anybody can claim, proposal fails', async function () {
      // mock set the deadline to 10 seconds
      await contracts.daoConfigsStorage.mock_set_uint_config(
        daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE,
        bN(10),
      );
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      // wait for after the deadline ends
      await waitFor((interimVotingPhaseDuration.plus(bN(11))).toNumber(), addressOf, web3);

      // proposer can claim
      assert.ok(await contracts.daoVotingClaims.claimProposalVotingResult.call(
        proposals[0].id,
        bN(1),
        bN(10),
        { from: proposals[0].proposer },
      ));
      // anybody can claim
      assert.ok(await contracts.daoVotingClaims.claimProposalVotingResult.call(
        proposals[0].id,
        bN(1),
        bN(10),
        { from: addressOf.allParticipants[3] },
      ));

      const rep0 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[0]);
      const rep1 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[1]);
      const rep4 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[4]);
      const rep5 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[5]);

      // claim the proposal
      await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[0].id,
        bN(1),
        bN(10),
        { from: addressOf.allParticipants[5] },
      );

      // proposal voting round is failed
      assert.deepEqual(await contracts.daoStorage.readProposalVotingResult.call(proposals[0].id, bN(1)), false);

      // proposal voting round is claimed
      assert.deepEqual(await contracts.daoStorage.isClaimed.call(proposals[0].id, bN(1)), true);

      // past voting round FALSE voters are awarded bonuses (allParticipants[4] and [5] had voted false)
      const bonusRP = getBonusReputation(
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_VOTE,
        daoConstantsValues(bN).CONFIG_BONUS_REPUTATION_NUMERATOR,
        daoConstantsValues(bN).CONFIG_BONUS_REPUTATION_DENOMINATOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_NUM,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_DEN,
      );
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[0]), rep0);
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[1]), rep1);
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[4]), rep4.plus(bN(bonusRP)));
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[5]), rep5.plus(bN(bonusRP)));
    });
    it('[only enough _operations so that votes are counted (but bonus not calculated)]: timeline not set, eth not allocated', async function () {
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber(), addressOf, web3);

      // since there are 4 participants, 4 operations needed to complete countProposalVote
      // in this case, bonus votes will not be calculated
      // timeline should not be set, ether should not be allocated
      await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[0].id,
        bN(1),
        bN(4),
        { from: proposals[0].proposer },
      );

      assert.deepEqual(await contracts.daoStorage.readProposalVotingTime.call(proposals[0].id, bN(2)), bN(0));
      assert.deepEqual(await contracts.daoStorage.readProposalNextMilestoneStart.call(proposals[0].id, bN(2)), bN(0));
      assert.deepEqual(await contracts.daoStorage.isClaimed.call(proposals[0].id, bN(1)), false);
      assert.deepEqual(await contracts.daoStorage.readProposalVotingResult.call(proposals[0].id, bN(1)), false);
      assert.deepEqual(await contracts.daoFundingStorage.claimableEth.call(proposals[0].proposer), bN(0));
    });
  });

  describe('updatePRL', function () {
    let participants;
    beforeEach(async function () {
      await resetBeforeEach();
      participants = getParticipants(addressOf, bN);
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[0].id,
        bN(0),
        true,
        proposals[0].proposer,
        proposals[0].endorser,
        proposals[0].versions[1].milestoneDurations,
        proposals[0].versions[1].milestoneFundings,
        proposals[0].versions[1].finalReward,
      );
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(0),
        true,
        [participants[0].address, participants[1].address, participants[2].address, participants[3].address],
        [true, true, true, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(0),
      );
      await waitFor(5, addressOf, web3); //  wait for draft voting phase to get done
      await contracts.daoVotingClaims.claimDraftVotingResult(proposals[0].id, bN(20), { from: proposals[0].proposer });
    });
    it('[non-prl calls function]: revert', async function () {
      for (const i of indexRange(2, 10)) {
        assert(await a.failure(contracts.dao.updatePRL(
          proposals[0].id,
          bN(1),
          'some:bytes',
          { from: accounts[i] },
        )));
      }
    });
    it('[if action is not stop/pause/unpause]: revert', async function () {
      // Stop    --> 1,
      // Pause   --> 2,
      // Unpause --> 3
      assert(await a.failure(contracts.dao.updatePRL(
        proposals[0].id,
        bN(4),
        'some:bytes',
        { from: addressOf.prl },
      )));
    });
    it('[pause a proposal during voting phase]: cannot claim eth | milestone starts at unpause time', async function () {
      const votesAndCommits = assignVotesAndCommits(addressOf);

      // put some commits
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votingCommits[0][0],
        { from: addressOf.allParticipants[0] },
      );
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votingCommits[0][1],
        { from: addressOf.allParticipants[1] },
      );
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votingCommits[0][4],
        { from: addressOf.allParticipants[4] },
      );
      // wait for reveal phase
      await waitFor(10, addressOf, web3);

      // reveal votes
      await contracts.daoVoting.revealVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votes[0][0],
        votesAndCommits.salts[0][0],
        { from: addressOf.allParticipants[0] },
      );
      await contracts.daoVoting.revealVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votes[0][1],
        votesAndCommits.salts[0][1],
        { from: addressOf.allParticipants[1] },
      );
      await contracts.daoVoting.revealVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votes[0][4],
        votesAndCommits.salts[0][4],
        { from: addressOf.allParticipants[4] },
      );

      // PRL pauses proposal
      await contracts.dao.updatePRL(
        proposals[0].id,
        bN(2),
        'pausing:proposal',
        { from: addressOf.prl },
      );

      // asserts
      assert.deepEqual(await contracts.daoStorage.readTotalPrlActions.call(proposals[0].id), bN(1));
      const action0 = await contracts.daoStorage.readPrlAction.call(proposals[0].id, bN(0));
      assert.deepEqual(action0[0], bN(2)); // pause
      assert.deepEqual(timeIsRecent(action0[1], 5), true);
      assert.deepEqual(action0[2], paddedHex(web3, 'pausing:proposal'));

      // wait for reveal phase to get over
      await waitFor(10, addressOf, web3);

      // claim the voting result
      await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[0].id,
        bN(0),
        bN(30),
        { from: proposals[0].proposer },
      );
      const nextVotingTimeBefore = await contracts.daoStorage.readProposalVotingTime.call(proposals[0].id, bN(1));
      assert.deepEqual(nextVotingTimeBefore, bN(0));

      // proposer shouldn't be able to claim eth (since proposal paused)
      assert(await a.failure(contracts.daoFundingManager.claimEthFunding(
        proposals[0].id,
        bN(0),
        proposals[0].versions[1].milestoneFundings[0],
        { from: proposals[0].proposer },
      )));

      // wait for some time before unpausing
      await waitFor(10, addressOf, web3);

      // unpause proposal
      await contracts.dao.updatePRL(
        proposals[0].id,
        bN(3),
        'unpausing:proposal',
        { from: addressOf.prl },
      );
      const unpausedAt = getCurrentTimestamp();

      // next interim voting time is set
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      const nextInterimVotingTime = await contracts.daoStorage.readProposalVotingTime.call(proposals[0].id, bN(1));
      const startOfDao = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      const nextMilestoneDuration = proposals[0].versions[1].milestoneDurations[0];
      const startOfThisMilestone = await contracts.daoStorage.readProposalNextMilestoneStart.call(proposals[0].id, bN(0));
      const claimDeadline = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE);
      let nextVotingTime = startOfThisMilestone.toNumber() + nextMilestoneDuration.toNumber();
      if (getTimeInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber()) < lockingPhaseDuration.toNumber()) {
        nextVotingTime += (lockingPhaseDuration.toNumber() - getTimeInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber())) + 1;
      } else if (getTimeLeftInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber()) < (interimVotingPhaseDuration.plus(claimDeadline).toNumber())) {
        nextVotingTime += getTimeLeftInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber()) + lockingPhaseDuration.toNumber() + 1;
      }
      assert.deepEqual(startOfThisMilestone, bN(unpausedAt));
      assert.deepEqual(nextInterimVotingTime, bN(nextVotingTime));

      // can now claim ether
      assert.ok(await contracts.daoFundingManager.claimEthFunding.call(
        proposals[0].id,
        bN(0),
        proposals[0].versions[1].milestoneFundings[0],
        { from: proposals[0].proposer },
      ));
    });
    it('[pause an ongoing proposal in 1st milestone, unpause later]: milestone start should be updated', async function () {
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(0),
        false,
        [participants[0].address, participants[1].address, participants[2].address, participants[3].address],
        [true, true, true, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp() + 20),
      );
      await waitFor(20, addressOf, web3);

      // claiming the funding now
      await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[0].id,
        bN(0),
        bN(10),
        { from: proposals[0].proposer },
      );
      await contracts.daoFundingManager.claimEthFunding(
        proposals[0].id,
        bN(0),
        proposals[0].versions[1].milestoneFundings[0],
        { from: proposals[0].proposer },
      );
      // wait for a little time in the milestone
      await waitFor(5, addressOf, web3);

      // pause the proposal
      await contracts.dao.updatePRL(proposals[0].id, bN(2), 'pausing:proposal', { from: addressOf.prl });

      // wait for the voting phase to begin
      const votingStartsAt = await contracts.daoStorage.readProposalVotingTime.call(proposals[0].id, bN(1));
      const waitTillVotingTime = (votingStartsAt.minus(bN(getCurrentTimestamp())));
      await waitFor(waitTillVotingTime.toNumber() + 1, addressOf, web3);

      // commit votes
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(1),
        false,
        [participants[0].address, participants[1].address, participants[2].address, participants[3].address],
        [true, true, true, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp() + 20),
      );

      // wait for reveal phase to get done
      await waitFor(21, addressOf, web3);
      await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[0].id,
        bN(1),
        bN(10),
        { from: proposals[0].proposer },
      );
      assert(await a.failure(contracts.daoFundingManager.claimEthFunding(
        proposals[0].id,
        bN(1),
        proposals[0].versions[1].milestoneFundings[1],
        { from: proposals[0].proposer },
      )));

      // wait for some time before unpausing proposal
      await waitFor(25, addressOf, web3);

      // unpause
      await contracts.dao.updatePRL(proposals[0].id, bN(3), 'unpause:proposal', { from: addressOf.prl });
      const unpausedAt = getCurrentTimestamp();

      // next interim voting time is set
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      const nextInterimVotingTime = await contracts.daoStorage.readProposalVotingTime.call(proposals[0].id, bN(2));
      const startOfDao = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      const nextMilestoneDuration = proposals[0].versions[1].milestoneDurations[1];
      const startOfThisMilestone = await contracts.daoStorage.readProposalNextMilestoneStart.call(proposals[0].id, bN(1));
      const claimDeadline = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE);
      let nextVotingTime = startOfThisMilestone.toNumber() + nextMilestoneDuration.toNumber();
      if (getTimeInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber()) < lockingPhaseDuration.toNumber()) {
        nextVotingTime += (lockingPhaseDuration.toNumber() - getTimeInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber())) + 1;
      } else if (getTimeLeftInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber()) < (interimVotingPhaseDuration.plus(claimDeadline).toNumber())) {
        nextVotingTime += getTimeLeftInQuarter(nextVotingTime, startOfDao.toNumber(), quarterDuration.toNumber()) + lockingPhaseDuration.toNumber() + 1;
      }
      assert.deepEqual(startOfThisMilestone, bN(unpausedAt));
      assert.deepEqual(nextInterimVotingTime, bN(nextVotingTime));

      // can claim the funding now
      assert.ok(await contracts.daoFundingManager.claimEthFunding(
        proposals[0].id,
        bN(1),
        proposals[0].versions[1].milestoneFundings[1],
        { from: proposals[0].proposer },
      ));
    });
    it('[pause and unpause proposal within the milestone (after funding has been claimed)]: should not change the voting times in any way', async function () {
      // put the mock votes for voting round 0
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(0),
        false,
        [participants[0].address, participants[1].address, participants[2].address, participants[3].address],
        [true, true, true, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp() + 20),
      );
      // wait for voting phase
      await waitFor(20, addressOf, web3);
      // claim the result
      await contracts.daoVotingClaims.claimProposalVotingResult(proposals[0].id, bN(0), bN(10), { from: proposals[0].proposer });

      const nextVotingTime = await contracts.daoStorage.readProposalVotingTime.call(proposals[0].id, bN(1));
      const nextMilestoneStart = await contracts.daoStorage.readProposalNextMilestoneStart.call(proposals[0].id, bN(1));

      // claim the funding
      await contracts.daoFundingManager.claimEthFunding(proposals[0].id, bN(0), proposals[0].versions[1].milestoneFundings[0], { from: proposals[0].proposer });

      // now the prl pauses the proposal
      await contracts.dao.updatePRL(proposals[0].id, bN(2), 'pausing:proposal[0]', { from: addressOf.prl });

      // wait for 5 seconds
      await waitFor(5, addressOf, web3);

      // unpause the proposal
      await contracts.dao.updatePRL(proposals[0].id, bN(3), 'unpaused:proposal[0]', { from: addressOf.prl });

      assert.deepEqual(await contracts.daoStorage.readProposalVotingTime.call(proposals[0].id, bN(1)), nextVotingTime);
      assert.deepEqual(await contracts.daoStorage.readProposalNextMilestoneStart.call(proposals[0].id, bN(1)), nextMilestoneStart);
    });
    it('[stop proposal just after claiming passed result]: should not be able to withdraw ether', async function () {
      // put the mock votes for voting round 0
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(0),
        false,
        [participants[0].address, participants[1].address, participants[2].address, participants[3].address],
        [true, true, true, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp() + 20),
      );
      // wait for voting phase
      await waitFor(20, addressOf, web3);
      // claim the result
      await contracts.daoVotingClaims.claimProposalVotingResult(proposals[0].id, bN(0), bN(10), { from: proposals[0].proposer });

      // unpause the proposal
      await contracts.dao.updatePRL(proposals[0].id, bN(1), 'stop:proposal[0]', { from: addressOf.prl });

      // claim the funding
      assert(await a.failure(contracts.daoFundingManager.claimEthFunding(
        proposals[0].id,
        bN(0),
        proposals[0].versions[1].milestoneFundings[0],
        { from: proposals[0].proposer },
      )));
    });
    it('[stop a proposal]', async function () {
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_MODERATED), proposals[0].id);
      await contracts.dao.updatePRL(proposals[0].id, bN(1), 'stop:proposal', { from: addressOf.prl });
      const readProposal = await contracts.daoStorage.readProposal.call(proposals[0].id);
      assert.deepEqual(readProposal[3], paddedHex(web3, proposalStates().PROPOSAL_STATE_CLOSED));
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_MODERATED), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_CLOSED), proposals[0].id);
    });
  });

  describe('setTimelineForNextMilestone', function () {
    beforeEach(async function () {
      await resetBeforeEach();
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE, bN(5));
    });
    it('[next voting time lies within main phase with enough time for voting]', async function () {
      // milestone starts now, milestone duration is only 5 seconds
      const proposalId = randomBytes32();
      const index = bN(1);
      const milestoneStart = bN(getCurrentTimestamp());
      const milestoneDuration = bN(5);

      await contracts.daoVotingClaims.mock_set_timeline_for_next_milestone(
        proposalId,
        index,
        milestoneStart,
        milestoneDuration,
      );

      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      assert.deepEqual(await contracts.daoStorage.readProposalVotingTime.call(proposalId, index), milestoneStart.plus(milestoneDuration));
      assert.deepEqual(await contracts.daoStorage.readProposalNextMilestoneStart.call(proposalId, index), milestoneStart.plus(milestoneDuration).plus(interimVotingPhaseDuration));
    });
    it('[next voting time lies within main phase, but with not enough time for voting left]: must be pushed to the next main phase', async function () {
      // milestone starts now, milestone duration is 40 seconds
      // so there should not be enough time for 20 seconds of voting
      const proposalId = randomBytes32();
      const index = bN(1);
      const milestoneStart = bN(getCurrentTimestamp());
      const milestoneDuration = bN(40);

      await contracts.daoVotingClaims.mock_set_timeline_for_next_milestone(
        proposalId,
        index,
        milestoneStart,
        milestoneDuration,
      );

      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const startOfDao = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      assert.deepEqual(await contracts.daoStorage.readProposalVotingTime.call(proposalId, index), startOfDao.plus(quarterDuration).plus(lockingPhaseDuration).plus(bN(1)));
      assert.deepEqual(await contracts.daoStorage.readProposalNextMilestoneStart.call(proposalId, index), startOfDao.plus(quarterDuration).plus(lockingPhaseDuration).plus(bN(1)).plus(interimVotingPhaseDuration));
    });
    it('[next voting time lies within main phase, enough time for voting, but not enough time for claim deadline]: pushed to next main phase', async function () {
      // milestone starts now, milestone duration is 27 seconds
      // so there should be enough time for 20 seconds of voting
      // but not enough time for 20+5 seconds of voting+claim_deadline
      const proposalId = randomBytes32();
      const index = bN(1);
      const milestoneStart = bN(getCurrentTimestamp());
      const milestoneDuration = bN(27);

      await contracts.daoVotingClaims.mock_set_timeline_for_next_milestone(
        proposalId,
        index,
        milestoneStart,
        milestoneDuration,
      );

      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const startOfDao = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      assert.deepEqual(await contracts.daoStorage.readProposalVotingTime.call(proposalId, index), startOfDao.plus(quarterDuration).plus(lockingPhaseDuration).plus(bN(1)));
      assert.deepEqual(await contracts.daoStorage.readProposalNextMilestoneStart.call(proposalId, index), startOfDao.plus(quarterDuration).plus(lockingPhaseDuration).plus(bN(1)).plus(interimVotingPhaseDuration));
    });
    it('[next voting time lies in the locking phase]: must be pushed to the main phase', async function () {
      // milestone starts now, milestone duration is 55 seconds
      // so next voting will technically lie in the locking phase
      const proposalId = randomBytes32();
      const index = bN(1);
      const milestoneStart = bN(getCurrentTimestamp());
      const milestoneDuration = bN(55);

      await contracts.daoVotingClaims.mock_set_timeline_for_next_milestone(
        proposalId,
        index,
        milestoneStart,
        milestoneDuration,
      );

      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const startOfDao = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      assert.deepEqual(await contracts.daoStorage.readProposalVotingTime.call(proposalId, index), startOfDao.plus(quarterDuration).plus(lockingPhaseDuration).plus(bN(1)));
      assert.deepEqual(await contracts.daoStorage.readProposalNextMilestoneStart.call(proposalId, index), startOfDao.plus(quarterDuration).plus(lockingPhaseDuration).plus(bN(1)).plus(interimVotingPhaseDuration));
    });
  });

  // TODO:
  describe('commitVoteOnSpecialProposal', function () {

  });

  // TODO:
  describe('revealVoteOnSpecialProposal', function () {

  });

  // TODO:
  describe('claimSpecialProposalVotingResult', function () {
    let specialProposalId;
    before(async function () {
      await resetBeforeEach();
      const uintConfigs = await contracts.daoConfigsStorage.readUintConfigs.call();
      specialProposalId = randomBytes32();
      uintConfigs[24] = bN(5);
      await contracts.dao.createSpecialProposal(
        specialProposalId,
        uintConfigs,
        [],
        [],
        { from: addressOf.founderBadgeHolder },
      );
      await contracts.dao.startSpecialProposalVoting(specialProposalId, { from: addressOf.founderBadgeHolder });
      await waitFor(2, addressOf, web3);
    });
  });
});
