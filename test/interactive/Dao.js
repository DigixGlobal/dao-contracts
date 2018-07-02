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
  waitFor,
  modifyProposal,
} = require('../setup');

const {
  phases,
  getTimeToNextPhase,
  proposalStates,
  daoConstantsKeys,
  daoConstantsValues,
  EMPTY_ADDRESS,
  EMPTY_BYTES,
} = require('../daoHelpers');

const {
  randomBigNumber,
  getCurrentTimestamp,
  timeIsRecent,
  randomBytes32,
  indexRange,
  randomAddress,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

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
      assert.deepEqual(readProposal[3], proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL);
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
      assert.deepEqual(await contracts.daoStorage.readProposalState.call(proposals[1].id), proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL);
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      assert.deepEqual(await contracts.dao.endorseProposal.call(
        proposals[1].id,
        { from: addressOf.badgeHolders[0] },
      ), true);
      await contracts.dao.endorseProposal(proposals[1].id, { from: addressOf.badgeHolders[0] });

      assert.deepEqual(await contracts.daoStorage.readProposalState.call(proposals[1].id), proposalStates(bN).PROPOSAL_STATE_DRAFT);
      assert.deepEqual((await contracts.daoStorage.readProposal.call(proposals[1].id))[2], addressOf.badgeHolders[0]);
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
      assert.deepEqual(await contracts.daoStorage.readProposalState.call(proposals[0].id), proposalStates(bN).PROPOSAL_STATE_DRAFT);
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
      assert.deepEqual(await contracts.dao.modifyProposal.call(
        proposals[1].id,
        proposals[1].versions[1].versionId,
        proposals[1].versions[1].milestoneDurations,
        proposals[1].versions[1].milestoneFundings,
        proposals[1].versions[1].finalReward,
        { from: addressOf.dgdHolders[1] },
      ), true);
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
      const finalVersionBefore = await contracts.daoStorage.readFinalVersion.call(proposals[0].id);
      const latestVersion = await contracts.daoStorage.getLastProposalVersion.call(proposals[0].id);
      await contracts.daoIdentity.updateKyc(
        proposals[0].proposer,
        'expiring kyc',
        bN(getCurrentTimestamp() + (3600 * 24 * 30)),
        { from: addressOf.kycadmin },
      );
      await contracts.dao.finalizeProposal(proposals[0].id, { from: proposals[0].proposer });
      const finalVersionAfter = await contracts.daoStorage.readFinalVersion.call(proposals[0].id);
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
      const startOfDao = await contracts.daoStorage.startOfFirstQuarter.call();
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
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      // proposals[1].proposer is no more a participant since
      // its quarter 2 and proposer has not continued participation
      assert(await a.failure(contracts.dao.finalizeProposal(proposals[1].id, { from: proposals[1].proposer })));
    });
    after(async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
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
      assert.deepEqual(await contracts.daoStorage.isReplacedByNewDao.call(), true);
      assert.deepEqual(await contracts.daoStorage.newDaoContract.call(), newDaoContract);
      assert.deepEqual(await contracts.daoStorage.newDaoFundingManager.call(), newDaoFundingManager.address);
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
      const startOfDao = await contracts.daoStorage.startOfFirstQuarter.call();
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
        proposals[0].versions[1].versionId,
        true,
        { from: addressOf.badgeHolders[0] },
      )));
      // finalize the proposal
      await contracts.dao.finalizeProposal(proposals[0].id, { from: proposals[0].proposer });
      await contracts.dao.finalizeProposal(proposals[1].id, { from: proposals[1].proposer });
    });
    it('[if version provided is not the finalized version of proposal]: revert', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[0]), true);
      assert(await a.failure(contracts.daoVoting.voteOnDraft(
        proposals[0].id,
        proposals[0].versions[0].versionId, // versions[1] is the latest finalized version
        true,
        { from: addressOf.badgeHolders[0] },
      )));
    });
    it('[if not a moderator for that quarter]: revert', async function () {
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.dgdHolders[0]), false);
      assert(await a.failure(contracts.daoVoting.voteOnDraft(
        proposals[0].id,
        proposals[0].versions[1].versionId,
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
        proposals[0].versions[1].versionId,
        true,
        { from: addressOf.badgeHolders[0] },
      );
      await contracts.daoVoting.voteOnDraft(
        proposals[0].id,
        proposals[0].versions[1].versionId,
        true,
        { from: addressOf.badgeHolders[1] },
      );
      await contracts.daoVoting.voteOnDraft(
        proposals[1].id,
        proposals[1].versions[0].versionId,
        false,
        { from: addressOf.badgeHolders[0] },
      );
      await contracts.daoVoting.voteOnDraft(
        proposals[1].id,
        proposals[1].versions[0].versionId,
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
      assert.deepEqual(readDraftVote00[1], true);
      assert.deepEqual(readDraftVote00[2], participants[0].dgdToLock);
      assert.deepEqual(readDraftVote01[0], true);
      assert.deepEqual(readDraftVote01[1], true);
      assert.deepEqual(readDraftVote01[2], participants[1].dgdToLock);
      assert.deepEqual(readDraftVote10[0], true);
      assert.deepEqual(readDraftVote10[1], false);
      assert.deepEqual(readDraftVote10[2], participants[0].dgdToLock);
      assert.deepEqual(readDraftVote11[0], true);
      assert.deepEqual(readDraftVote11[1], false);
      assert.deepEqual(readDraftVote11[2], participants[1].dgdToLock);

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
        proposals[0].versions[1].versionId,
        false,
        { from: addressOf.badgeHolders[0] },
      );
      await contracts.daoVoting.voteOnDraft(
        proposals[1].id,
        proposals[1].versions[0].versionId,
        true,
        { from: addressOf.badgeHolders[1] },
      );

      // read draft vote
      const readDraftVote0 = await contracts.daoStorage.readDraftVote.call(proposals[0].id, addressOf.badgeHolders[0]);
      const readDraftVote1 = await contracts.daoStorage.readDraftVote.call(proposals[1].id, addressOf.badgeHolders[1]);
      assert.deepEqual(readDraftVote0[0], true);
      assert.deepEqual(readDraftVote0[1], false);
      assert.deepEqual(readDraftVote1[0], true);
      assert.deepEqual(readDraftVote1[1], true);

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
        proposals[0].versions[1].versionId,
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
        proposals[1].versions[0].versionId,
        true,
        { from: proposals[1].proposer },
      )));
    });
    after(async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
    });
  });

  describe('claimDraftVotingResult', function () {
    before(async function () {
      // need moderators to confirm participation in this quarter
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
        proposals[2].versions[0].versionId,
        true,
        { from: addressOf.badgeHolders[0] },
      );
      await contracts.daoVoting.voteOnDraft(
        proposals[2].id,
        proposals[2].versions[0].versionId,
        true,
        { from: addressOf.badgeHolders[1] },
      );

      // proposals[2] should pass, but its not yet end of draft voting phase
      assert(await a.failure(contracts.daoVotingClaims.claimDraftVotingResult.call(proposals[2].id, { from: proposals[2].proposer })));

      // now change the votes
      await contracts.daoVoting.voteOnDraft(
        proposals[2].id,
        proposals[2].versions[0].versionId,
        false,
        { from: addressOf.badgeHolders[0] },
      );
      await contracts.daoVoting.voteOnDraft(
        proposals[2].id,
        proposals[2].versions[0].versionId,
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
      const voteCount0 = await contracts.daoStorage.readDraftVotingCount.call(proposals[0].id, addressOf.allParticipants);
      const minimumDraftQuorum = await contracts.daoCalculatorService.minimumDraftQuorum.call(proposals[2].id);
      assert.isAtLeast(voteCount0[2].toNumber(), minimumDraftQuorum.toNumber());
      assert.deepEqual(await contracts.daoCalculatorService.draftQuotaPass.call(voteCount0[0], voteCount0[1]), true);
      assert.deepEqual(await contracts.daoStorage.readProposalDraftVotingResult.call(proposals[0].id), false);

      // conditions met, claim the draft voting results
      assert.deepEqual(await contracts.daoVotingClaims.claimDraftVotingResult.call(proposals[0].id, { from: proposals[0].proposer }), true);
      await contracts.daoVotingClaims.claimDraftVotingResult(proposals[0].id, { from: proposals[0].proposer });

      // draft voting result set
      assert.deepEqual(await contracts.daoStorage.readProposalDraftVotingResult.call(proposals[0].id), true);

      // voting time is set
      const draftVotingStart = await contracts.daoStorage.readProposalDraftVotingTime.call(proposals[0].id);
      const draftVotingDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_DRAFT_VOTING_PHASE);
      const timeNow = draftVotingStart.toNumber() + draftVotingDuration.toNumber();
      const startOfDao = await contracts.daoStorage.startOfFirstQuarter.call();
      const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
      const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
      const timeToLockingPhase = getTimeToNextPhase(timeNow, startOfDao.toNumber(), lockingPhaseDuration.toNumber(), quarterDuration.toNumber());
      const votingRoundDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTING_PHASE_TOTAL);
      let idealVotingTime;
      if (timeToLockingPhase < votingRoundDuration.toNumber()) {
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
        { from: proposals[0].proposer },
      )));
    });
  });

  // TODO
  describe('commitVoteOnProposal', function () {
    before(async function () {
      await resetBeforeEach();
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
      console.log('ok put proposals');
    });
    it('[if not voting commit phase]: revert', async function () {

    });
    it('[if invalid proposal state for voting round]: revert', async function () {

    });
    it('[if called by non-participant]: revert', async function () {

    });
    it('[valid commit vote]: verify read functions', async function () {

    });
    it('[re-using nonce for commiting vote]: revert', async function () {

    });
    it('[update commit vote valid]: verify read functions', async function () {

    });
    it('[copying existing commit]: revert', async function () {

    });
    after(async function () {

    });
  });

  // // TODO
  // describe('revealVoteOnProposal', function () {
  //   before(async function () {
  //
  //   });
  //   it('[if not the voting reveal phase]: revert', async function () {
  //
  //   });
  //   it('[if proposal state is not valid]: revert', async function () {
  //
  //   });
  //   it('[if non-participant calls]: revert', async function () {
  //
  //   });
  //   it('[revealed vote cannot verify last commit]: revert', async function () {
  //
  //   });
  //   it('[reveal successfully]: verify read functions', async function () {
  //     // read vote
  //
  //     // check quarter point
  //   });
  //   it('[revealing vote again]: revert', async function () {
  //
  //   });
  //   after(async function () {
  //
  //   });
  // });
  //
  // // TODO
  // describe('claimVotingResult', function () {
  //   before(async function () {
  //
  //   });
  //   it('[if locking phase]: revert', async function () {
  //
  //   });
  //   it('[if non-dao member claims]: revert', async function () {
  //
  //   });
  //   it('[if claiming before reveal phase ends]: revert', function () {
  //
  //   });
  //   it('[if quorum is not met]: revert', async function () {
  //
  //   });
  //   it('[if quota is not met]: revert', async function () {
  //
  //   });
  //   it('[valid claim]: verify read functions', async function () {
  //     // voting result set
  //
  //     // first interim voting time is set
  //
  //     // claimer is set
  //
  //     // quarter point is awarded to claimer
  //
  //     // claimable updated
  //   });
  //   it('[if milestone 1 time ends around the LOCKING_PHASE, interim voting should be pushed to start of MAIN_PHASE]: verify', async function () {
  //
  //   });
  //   it('[re-claim same voting round]: revert', async function () {
  //
  //   });
  //   after(async function () {
  //
  //   });
  // });
  //
  // // TODO
  // describe('commitVoteOnInterim', function () {
  //   before(async function () {
  //
  //   });
  //   it('[if not interim voting commit phase]: revert', async function () {
  //
  //   });
  //   it('[if invalid proposal state for interim voting round]: revert', async function () {
  //
  //   });
  //   it('[if called by non-participant]: revert', async function () {
  //
  //   });
  //   it('[valid commit vote]: verify read functions', async function () {
  //
  //   });
  //   it('[re-using nonce for commiting vote]: revert', async function () {
  //
  //   });
  //   it('[update commit vote valid]: verify read functions', async function () {
  //
  //   });
  //   it('[copying existing commit]: revert', async function () {
  //
  //   });
  //   after(async function () {
  //
  //   });
  // });
  //
  // // TODO
  // describe('revealVoteOnInterim', function () {
  //   before(async function () {
  //
  //   });
  //   it('[if not the interim voting reveal phase]: revert', async function () {
  //
  //   });
  //   it('[if proposal state is not valid]: revert', async function () {
  //
  //   });
  //   it('[if non-participant calls]: revert', async function () {
  //
  //   });
  //   it('[revealed vote cannot verify last commit]: revert', async function () {
  //
  //   });
  //   it('[reveal successfully]: verify read functions', async function () {
  //     // read vote
  //
  //     // check quarter point
  //   });
  //   it('[revealing vote again]: revert', async function () {
  //
  //   });
  //   after(async function () {
  //
  //   });
  // });
  //
  // // TODO
  // describe('claimInterimVotingResult', function () {
  //   before(async function () {
  //
  //   });
  //   it('[if locking phase]: revert', async function () {
  //
  //   });
  //   it('[if non-dao member claims]: revert', async function () {
  //
  //   });
  //   it('[if claiming before reveal phase ends]: revert', function () {
  //
  //   });
  //   it('[if quorum is not met]: verify read functions', async function () {
  //     // voting result set
  //
  //     // claimer is set
  //
  //     // quarter point is awarded to claimer
  //
  //     // bonus reputation is awarded
  //   });
  //   it('[if quota is not met]: verify read functions', async function () {
  //     // voting result set
  //
  //     // claimer is set
  //
  //     // quarter point is awarded to claimer
  //
  //     // bonus reputation is awarded
  //   });
  //   it('[passing claim]: verify read functions', async function () {
  //     // voting result set
  //
  //     // first interim voting time is set
  //
  //     // claimer is set
  //
  //     // quarter point is awarded to claimer
  //
  //     // bonus reputation is awarded
  //
  //     // claimable eth updated
  //   });
  //   it('[if next milestone period ends nearby LOCKING_PHASE, push it to the beginning of MAIN_PHASE]: verify', async function () {
  //
  //   });
  //   it('[if there is no more milestone left, and if voting result is PASS, final rewards must be given to proposer]', async function () {
  //
  //   });
  //   it('[re-claim same interim voting round]: revert', async function () {
  //
  //   });
  //   after(async function () {
  //
  //   });
  //
  // });
});
