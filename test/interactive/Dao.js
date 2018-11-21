const a = require('awaiting');

const MockDaoFundingManager = artifacts.require('MockDaoFundingManager.sol');

const {
  deployFreshDao,
  setupParticipantsStates,
  getTestProposals,
  phaseCorrection,
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
  collateralStatus,
  EMPTY_ADDRESS,
  EMPTY_BYTES,
} = require('../daoHelpers');

const {
  getBonusReputation,
} = require('../daoCalculationHelper');

const {
  randomBigNumber,
  randomBigNumbers,
  getCurrentTimestamp,
  timeIsRecent,
  randomBytes32,
  randomBytes32s,
  indexRange,
  randomAddress,
  randomAddresses,
  paddedHex,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;
const web3Utils = require('web3-utils');

contract('Dao', function (accounts) {
  const libs = {};
  const contracts = {};
  const addressOf = {};
  let proposals;

  // this function deploys new instances of all contracts and starts the first quarter of DAO
  // this also sets up the initial states for some participants by transferring tokens and
  // locking them
  // finally get some test proposals and add users to the groups
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
        { from: addressOf.dgdHolders[4], value: bN(2 * (10 ** 18)) },
      )));
    });
    it('[if milestone fundings exceed weiInDao]: revert', async function () {
      // fundings and durations are unequal in length: revert
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.dgdHolders[0]), true);

      // total funding required crosses the weiInDao: revert
      const weiInDao = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const funding1 = weiInDao.minus(bN(10 * (10 ** 18)));
      const funding2 = bN(20 * (10 ** 18));
      assert(await a.failure(contracts.dao.submitPreproposal(
        proposals[0].id,
        [funding1, funding2],
        proposals[0].versions[0].finalReward,
        { from: addressOf.dgdHolders[0], value: bN(2 * (10 ** 18)) },
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
        proposals[0].versions[0].milestoneFundings,
        proposals[0].versions[0].finalReward,
        { from: addressOf.dgdHolders[1], value: bN(2 * (10 ** 18)) },
      )));
      // kyc approve dgdHolders[1]
      await contracts.daoIdentity.updateKyc(
        addressOf.dgdHolders[1],
        'valid for 1 month',
        bN(getCurrentTimestamp() + (3600 * 24 * 30)),
        { from: addressOf.kycadmin },
      );
    });
    it('[non-digix proposal crossing the max cap in funding]: revert', async function () {
      // cap is 20 ethers
      assert(await a.failure(contracts.dao.submitPreproposal(
        randomBytes32(),
        [bN(10 * (10 ** 18)), bN(10 * (10 ** 18))],
        bN(1 * (10 ** 18)),
        { from: addressOf.dgdHolders[0], value: bN(2 * (10 ** 18)) },
      )));
    });
    it('[non-digix proposal crossing the max number of milestones]: revert', async function () {
      // max number of milestones is 2
      assert(await a.failure(contracts.dao.submitPreproposal(
        randomBytes32(),
        [bN(5 * (10 ** 18)), bN(5 * (10 ** 18)), bN(5 * (10 ** 18))],
        bN(1 * (10 ** 18)),
        { from: addressOf.dgdHolders[0], value: bN(2 * (10 ** 18)) },
      )));
    });
    it('[proposer sends less than the preproposal deposit (collateral) amount]: revert', async function () {
      // collateral should be 2 ether
      assert(await a.failure(contracts.dao.submitPreproposal(
        randomBytes32(),
        [bN(5 * (10 ** 18)), bN(5 * (10 ** 18))],
        bN(1 * (10 ** 18)),
        { from: addressOf.dgdHolders[0], value: bN(1 * (10 ** 18)) },
      )));
    });
    it('[digix proposal (proposer = founder)]: no cap on max number of milestones and funding', async function () {
      const proposalId = randomBytes32();
      assert.deepEqual(await contracts.dao.isParticipant.call(addressOf.founderBadgeHolder), true);
      assert.ok(await contracts.dao.submitPreproposal.call(
        proposalId,
        [bN(20 * (10 ** 18)), bN(40 * (10 ** 18)), bN(30 * (10 ** 18))],
        bN(1 * (10 ** 18)),
        { from: addressOf.founderBadgeHolder, value: bN(2 * (10 ** 18)) },
      ));
      await contracts.dao.submitPreproposal(
        proposalId,
        [bN(20 * (10 ** 18)), bN(40 * (10 ** 18)), bN(30 * (10 ** 18))],
        bN(1 * (10 ** 18)),
        { from: addressOf.founderBadgeHolder, value: bN(2 * (10 ** 18)) },
      );
      const readProposal = await contracts.daoStorage.readProposal.call(proposalId);
      assert.deepEqual(readProposal[9], true); // is digix proposal
      assert.deepEqual(await contracts.daoStorage.readProposalCollateralStatus.call(proposalId), collateralStatus(bN).COLLATERAL_STATUS_UNLOCKED);
    });
    it('[valid inputs]: success | verify read functions', async function () {
      const daoBalanceBefore = await web3.eth.getBalance(contracts.daoFundingManager.address);
      await contracts.dao.submitPreproposal(
        proposals[0].id,
        proposals[0].versions[0].milestoneFundings,
        proposals[0].versions[0].finalReward,
        { from: addressOf.dgdHolders[0], value: bN(2 * (10 ** 18)) },
      );
      // add another proposal
      await contracts.dao.submitPreproposal(
        proposals[1].id,
        proposals[1].versions[0].milestoneFundings,
        proposals[1].versions[0].finalReward,
        { from: addressOf.dgdHolders[1], value: bN(2 * (10 ** 18)) },
      );
      const readProposal = await contracts.daoStorage.readProposal.call(proposals[0].id);
      assert.deepEqual(readProposal[0], proposals[0].id);
      assert.deepEqual(readProposal[1], addressOf.dgdHolders[0]);
      assert.deepEqual(readProposal[2], EMPTY_ADDRESS);
      assert.deepEqual(readProposal[3], paddedHex(web3, proposalStates().PROPOSAL_STATE_PREPROPOSAL));
      assert.deepEqual(timeIsRecent(readProposal[4], 10), true);
      assert.deepEqual(readProposal[5], bN(1));
      assert.deepEqual(readProposal[6], proposals[0].id);
      assert.deepEqual(readProposal[9], false); // not digix proposal

      // daoFundingManager should have more ethers (per proposal * 2 proposals)
      assert.deepEqual(
        await web3.eth.getBalance(contracts.daoFundingManager.address),
        daoBalanceBefore.plus(daoConstantsValues(bN).CONFIG_PREPROPOSAL_COLLATERAL.times(bN(2))),
      );
    });
    it('[not main phase]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      assert(await a.failure(contracts.dao.submitPreproposal(
        proposals[1].id,
        proposals[1].versions[0].milestoneFundings,
        proposals[1].versions[0].finalReward,
        { from: addressOf.dgdHolders[0], value: bN(2 * (10 ** 18)) },
      )));
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
      // assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      assert.deepEqual(await contracts.daoStakeStorage.isInModeratorsList.call(addressOf.badgeHolders[0]), true);
      const rep = await contracts.daoPointsStorage.getReputation.call(addressOf.badgeHolders[0]);
      assert.isAtLeast(rep.toNumber(), 100);
      assert.deepEqual(await contracts.daoRewardsStorage.lastParticipatedQuarter.call(addressOf.badgeHolders[0]), bN(2));
      assert(await a.failure(contracts.dao.endorseProposal.call(
        proposals[1].id,
        { from: addressOf.badgeHolders[0] },
      )));
    });
  });

  describe('modifyProposal', async function () {
    const founderProposalId = randomBytes32();
    before(async function () {
      await resetBeforeEach();
      await addProposal(contracts, proposals[0]);
      await addProposal(contracts, proposals[1]);
      await endorseProposal(contracts, proposals[0]);
      await endorseProposal(contracts, proposals[1]);
      await contracts.dao.submitPreproposal(
        founderProposalId,
        [bN(25 * (10 ** 18)), bN(30 * (10 ** 18)), bN(20 * (10 ** 18))],
        bN(5 * (10 ** 18)),
        { from: addressOf.founderBadgeHolder, value: bN(2 * (10 ** 18)) },
      );
      await contracts.dao.endorseProposal(founderProposalId, { from: addressOf.allParticipants[0] });
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
    it('[if milestone fundings are not valid (exceed the max cap for non-digix proposal)]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      assert.deepEqual(await contracts.daoStorage.readProposalProposer.call(proposals[1].id), addressOf.dgdHolders[1]);
      assert(await a.failure(contracts.dao.modifyProposal.call(
        proposals[1].id,
        proposals[1].versions[1].versionId,
        [bN(10 * (10 ** 18)), bN(10 * (10 ** 18))],
        proposals[1].versions[1].finalReward,
        { from: addressOf.dgdHolders[1] },
      )));
    });
    it('[if digix proposal, no cap on milestones and funding]', async function () {
      const newFounderProposalId = randomBytes32();
      assert.ok(await contracts.dao.modifyProposal.call(
        founderProposalId,
        newFounderProposalId,
        [bN(15 * (10 ** 18)), bN(20 * (10 ** 18)), bN(25 * (10 ** 18)), bN(5 * (10 ** 18))],
        bN(2 * (10 ** 18)),
        { from: addressOf.founderBadgeHolder },
      ));
    });
    it('[valid]: success | verify read functions', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      await contracts.dao.modifyProposal(
        proposals[1].id,
        proposals[1].versions[1].versionId,
        proposals[1].versions[1].milestoneFundings,
        proposals[1].versions[1].finalReward,
        { from: addressOf.dgdHolders[1] },
      );
      const readProposalVersion = await contracts.daoStorage.readProposalVersion.call(proposals[1].id, proposals[1].versions[1].versionId);
      assert.deepEqual(readProposalVersion[0], proposals[1].versions[1].versionId);
      assert.deepEqual(timeIsRecent(readProposalVersion[1], 5), true);
      assert.deepEqual(readProposalVersion[2], proposals[1].versions[1].milestoneFundings);
      assert.deepEqual(readProposalVersion[3], proposals[1].versions[1].finalReward);
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
        proposals[1].versions[2].milestoneFundings,
        proposals[1].versions[2].finalReward,
        { from: addressOf.dgdHolders[1] },
      )));
    });
  });

  describe('finalizeProposal', function () {
    before(async function () {
      await resetBeforeEach();
      await addProposal(contracts, proposals[0]);
      await addProposal(contracts, proposals[1]);
      await addProposal(contracts, proposals[2]);
      await endorseProposal(contracts, proposals[0]);
      await endorseProposal(contracts, proposals[1]);
      await contracts.dao.modifyProposal(
        proposals[0].id,
        proposals[0].versions[1].versionId,
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
    it('[if proposal is not endorsed]: revert', async function () {
      assert(await a.failure(contracts.dao.finalizeProposal(
        proposals[2].id,
        { from: addressOf.dgdHolders[2] },
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
    it('[cannot finalize more than capped number of proposals in a quarter (only for non-digix proposals)]', async function () {
      // the max number of proposal per quarter is set to 10
      // finalize 9 more dummy proposals
      await contracts.daoProposalCounterStorage.mock_set_proposal_count(bN(1), bN(10));

      // now the next proposal can be created, but cannot be finalized in the same quarter
      const dummyDoc = randomBytes32();
      const dummyFunding = [bN(4 * (10 ** 18)), bN(3 * (10 ** 18))];
      await contracts.dao.submitPreproposal(dummyDoc, dummyFunding, bN(1 * (10 ** 18)), { from: addressOf.dgdHolders[0], value: bN(2 * (10 ** 18)) });
      await contracts.dao.endorseProposal(dummyDoc, { from: addressOf.badgeHolders[0] });
      assert(await a.failure(contracts.dao.finalizeProposal(dummyDoc, { from: addressOf.dgdHolders[0] })));

      // but a Digix proposal can be finalized (the counter is valid only for non-digix proposals)
      const founderDoc = randomBytes32();
      await contracts.dao.submitPreproposal(founderDoc, [bN(100 * (10 ** 18)), bN(50 * (10 ** 18))], bN(10 * (10 ** 18)), { from: addressOf.founderBadgeHolder, value: bN(2 * (10 ** 18)) });
      await contracts.dao.endorseProposal(founderDoc, { from: addressOf.badgeHolders[0] });
      assert.ok(await contracts.dao.finalizeProposal(founderDoc, { from: addressOf.founderBadgeHolder }));
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
  });

  describe('setNewDaoContracts', function () {
    let newDaoContract;
    let newDaoFundingManager;
    let newDaoRewardsManager;
    before(async function () {
      await resetBeforeEach();
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(10 * (10 ** 9)));
      newDaoContract = randomAddress();
      newDaoFundingManager = await MockDaoFundingManager.new();
      newDaoRewardsManager = randomAddress();
    });
    it('[not called by owner]: revert', async function () {
      assert(await a.failure(contracts.dao.setNewDaoContracts.call(
        newDaoContract,
        newDaoFundingManager.address,
        newDaoRewardsManager,
        { from: accounts[1] },
      )));
    });
    it('[set the contract addresses]', async function () {
      await contracts.dao.setNewDaoContracts(
        newDaoContract,
        newDaoFundingManager.address,
        newDaoRewardsManager,
        { from: addressOf.root },
      );
      assert.deepEqual(await contracts.daoUpgradeStorage.newDaoContract.call(), newDaoContract);
      assert.deepEqual(await contracts.daoUpgradeStorage.newDaoFundingManager.call(), newDaoFundingManager.address);
      assert.deepEqual(await contracts.daoUpgradeStorage.newDaoRewardsManager.call(), newDaoRewardsManager);
    });
    it('[try to set the contract addresses after the dao is already migrated]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
      await contracts.dao.migrateToNewDao(
        newDaoContract,
        newDaoFundingManager.address,
        newDaoRewardsManager,
        { from: addressOf.root },
      );
      assert(await a.failure(contracts.dao.setNewDaoContracts.call(
        randomAddress(),
        randomAddress(),
        randomAddress(),
        { from: addressOf.root },
      )));
    });
  });

  describe('migrateToNewDao', function () {
    let newDaoContract;
    let newDaoFundingManager;
    let newDaoRewardsManager;
    before(async function () {
      await resetBeforeEach();
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(10 * (10 ** 9)));
      newDaoContract = randomAddress();
      newDaoFundingManager = await MockDaoFundingManager.new();
      newDaoRewardsManager = randomAddress();
      await contracts.dao.setNewDaoContracts(newDaoContract, newDaoFundingManager.address, newDaoRewardsManager);
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
    });
    it('[if global rewards are not calculated]: revert', async function () {
      assert(await a.failure(contracts.dao.migrateToNewDao.call(
        newDaoContract,
        newDaoFundingManager.address,
        newDaoRewardsManager,
      )));

      // now calculate the global rewards
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });
    });
    it('[if not called by owner/root]: revert', async function () {
      for (const i of indexRange(1, 20)) {
        assert(await a.failure(contracts.dao.migrateToNewDao(
          newDaoContract,
          newDaoFundingManager.address,
          newDaoRewardsManager,
          { from: accounts[i] },
        )));
      }
    });
    it('[one of the contract addresses does not match]: revert', async function () {
      assert(await a.failure(contracts.dao.migrateToNewDao(
        newDaoContract,
        newDaoFundingManager.address,
        randomAddress(),
      )));
      assert(await a.failure(contracts.dao.migrateToNewDao(
        randomAddress(),
        newDaoFundingManager.address,
        newDaoRewardsManager,
      )));
      const dummyFundingManager = await MockDaoFundingManager.new();
      assert(await a.failure(contracts.dao.migrateToNewDao(
        newDaoContract,
        dummyFundingManager.address,
        newDaoRewardsManager,
      )));
    });
    it('[valid migration to a new contract]', async function () {
      const fundsBefore = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const dgxBalanceBefore = await contracts.dgxToken.balanceOf.call(contracts.daoRewardsManager.address);
      await contracts.dao.migrateToNewDao(
        newDaoContract,
        newDaoFundingManager.address,
        newDaoRewardsManager,
        { from: addressOf.root },
      );
      const transferConfigs = await contracts.dgxStorage.read_transfer_config.call();
      const transferFees = transferConfigs[2].times(dgxBalanceBefore).dividedToIntegerBy(transferConfigs[1]);
      assert.deepEqual(await contracts.daoUpgradeStorage.isReplacedByNewDao.call(), true);
      assert.deepEqual(await web3.eth.getBalance(contracts.daoFundingManager.address), bN(0));
      assert.deepEqual(await web3.eth.getBalance(newDaoFundingManager.address), fundsBefore);
      assert.deepEqual(await contracts.dgxToken.balanceOf.call(contracts.daoRewardsManager.address), bN(0));
      assert.deepEqual(await contracts.dgxToken.balanceOf.call(newDaoRewardsManager), dgxBalanceBefore.minus(transferFees));
    });
    it('[re-try migrating to new dao (to falsify info)]: revert', async function () {
      const newDaoContractAddress2 = randomAddress();
      const newDaoFundingManager2 = await MockDaoFundingManager.new();
      const newDaoRewardsManager2 = randomAddress();
      await web3.eth.sendTransaction({
        from: accounts[0],
        to: contracts.daoFundingManager.address,
        value: web3.toWei(1, 'ether'),
      });
      assert(await a.failure(contracts.dao.migrateToNewDao(
        newDaoContractAddress2,
        newDaoFundingManager2.address,
        newDaoRewardsManager2,
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
        assert(await a.failure(contracts.daoSpecialProposal.createSpecialProposal(
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
      await contracts.daoSpecialProposal.createSpecialProposal(doc, uintConfigs, [], [], { from: addressOf.founderBadgeHolder });
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
      assert(await a.failure(contracts.daoSpecialProposal.createSpecialProposal(doc, uintConfigs, [], [], { from: addressOf.founderBadgeHolder })));
    });
  });

  describe('startSpecialProposalVoting', function () {
    const doc = randomBytes32();
    before(async function () {
      await resetBeforeEach();
      const uintConfigs = await contracts.daoConfigsStorage.readUintConfigs.call();
      await contracts.daoSpecialProposal.createSpecialProposal(doc, uintConfigs, [], [], { from: addressOf.founderBadgeHolder });
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
      assert(await a.failure(contracts.daoSpecialProposal.startSpecialProposalVoting(doc, { from: addressOf.founderBadgeHolder })));
    });
    it('[if called in locking phase]: revert', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      assert(await a.failure(contracts.daoSpecialProposal.startSpecialProposalVoting(doc, { from: addressOf.founderBadgeHolder })));
    });
    it('[called in the main phase, enough time for entire voting]: success', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      assert.deepEqual(await contracts.daoSpecialStorage.readVotingTime.call(doc), bN(0));
      const tx = await contracts.daoSpecialProposal.startSpecialProposalVoting(doc, { from: addressOf.founderBadgeHolder });
      assert.deepEqual(timeIsRecent(await contracts.daoSpecialStorage.readVotingTime.call(doc), 2), true);

      // verify event logs
      assert.deepEqual(tx.logs[0].event, 'StartSpecialProposal');
      assert.deepEqual(tx.logs[0].args._specialProposalId, doc);
      assert.deepEqual(timeIsRecent(tx.logs[0].args._startTime, 2), true);
    });
  });

  describe('commitVoteOnSpecialProposal', function () {
    let specialProposalId;
    let votesAndCommits;
    let participants;
    before(async function () {
      await resetBeforeEach();
      participants = getParticipants(addressOf, bN);
      const uintConfigs = await contracts.daoConfigsStorage.readUintConfigs.call();
      specialProposalId = randomBytes32();
      uintConfigs[24] = bN(5);
      // add a special proposal with voting time starting now
      await contracts.daoSpecialStorage.mock_put_proposal_as(
        specialProposalId,
        addressOf.founderBadgeHolder,
        uintConfigs,
        [],
        [],
        bN(getCurrentTimestamp()),
      );
      votesAndCommits = assignVotesAndCommits(
        addressOf, 1, 4,
        [participants[0].address, participants[1].address, participants[2].address, participants[3].address],
      );
    });
    it('[if not a participant]: revert', async function () {
      // dgdHolders[3] is not a participant
      assert(await a.failure(contracts.daoVoting.commitVoteOnSpecialProposal(
        specialProposalId,
        votesAndCommits.votingCommits[0][0],
        { from: addressOf.dgdHolders[3] },
      )));
    });
    it('[participant, valid commit]: read commit', async function () {
      assert.ok(await contracts.daoVoting.commitVoteOnSpecialProposal.call(
        specialProposalId,
        votesAndCommits.votingCommits[0][0],
        { from: participants[0].address },
      ));
      await contracts.daoVoting.commitVoteOnSpecialProposal(
        specialProposalId,
        votesAndCommits.votingCommits[0][0],
        { from: participants[0].address },
      );
      await contracts.daoVoting.commitVoteOnSpecialProposal(
        specialProposalId,
        votesAndCommits.votingCommits[0][1],
        { from: participants[1].address },
      );
      assert.deepEqual(await contracts.daoSpecialStorage.readComittedVote.call(specialProposalId, participants[0].address), votesAndCommits.votingCommits[0][0]);
      assert.deepEqual(await contracts.daoSpecialStorage.readComittedVote.call(specialProposalId, participants[1].address), votesAndCommits.votingCommits[0][1]);
    });
    it('[within commit phase, modify commit]: success', async function () {
      const randomHash = randomBytes32();
      await contracts.daoVoting.commitVoteOnSpecialProposal(
        specialProposalId,
        randomHash,
        { from: participants[1].address },
      );
      assert.deepEqual(await contracts.daoSpecialStorage.readComittedVote.call(specialProposalId, participants[1].address), randomHash);
    });
    it('[if commit after the commit phase]: revert', async function () {
      await waitFor(11, addressOf, web3);

      // after commit phase is over
      assert(await a.failure(contracts.daoVoting.commitVoteOnSpecialProposal.call(
        specialProposalId,
        votesAndCommits.votingCommits[0][2],
        { from: participants[2].address },
      )));
    });
  });

  describe('revealVoteOnSpecialProposal', function () {
    let specialProposalId;
    let participants;
    let votesAndCommits;
    before(async function () {
      await resetBeforeEach();
      participants = getParticipants(addressOf, bN);
      const uintConfigs = await contracts.daoConfigsStorage.readUintConfigs.call();
      specialProposalId = randomBytes32();
      uintConfigs[24] = bN(5);
      // create special proposal with voting time that was 5 seconds in the past
      // that is, skip the commit phase, and mock the commits
      await contracts.daoSpecialStorage.mock_put_proposal_as(
        specialProposalId,
        addressOf.founderBadgeHolder,
        uintConfigs,
        [],
        [],
        bN(getCurrentTimestamp()).minus(bN(5)),
      );
      votesAndCommits = assignVotesAndCommits(
        addressOf, 1, 4,
        [participants[0].address, participants[1].address, participants[2].address, participants[3].address],
      );
      await contracts.daoSpecialStorage.mock_put_commit_votes(
        specialProposalId,
        [participants[0].address, participants[1].address, participants[2].address, participants[3].address],
        [votesAndCommits.votingCommits[0][0], votesAndCommits.votingCommits[0][1], votesAndCommits.votingCommits[0][2], votesAndCommits.votingCommits[0][3]],
        bN(4),
      );
    });
    it('[if revealing before the reveal phase begins]: revert', async function () {
      assert(await a.failure(contracts.daoVoting.revealVoteOnSpecialProposal.call(
        specialProposalId,
        votesAndCommits.votes[0][0],
        votesAndCommits.salts[0][0],
        { from: participants[0].address },
      )));
    });
    it('[if the wrong vote is revealed]: revert', async function () {
      // now wait for 6 seconds (for reveal phase to begin)
      await waitFor(6, addressOf, web3);

      // reveal the vote with wrong salt
      assert(await a.failure(contracts.daoVoting.revealVoteOnSpecialProposal.call(
        specialProposalId,
        votesAndCommits.votes[0][0],
        votesAndCommits.salts[0][1],
        { from: participants[0].address },
      )));
    });
    it('[valid reveal vote]: read the vote', async function () {
      assert.ok(await contracts.daoVoting.revealVoteOnSpecialProposal.call(
        specialProposalId,
        votesAndCommits.votes[0][0],
        votesAndCommits.salts[0][0],
        { from: participants[0].address },
      ));
      await contracts.daoVoting.revealVoteOnSpecialProposal(
        specialProposalId,
        votesAndCommits.votes[0][0],
        votesAndCommits.salts[0][0],
        { from: participants[0].address },
      );
      await contracts.daoVoting.revealVoteOnSpecialProposal(
        specialProposalId,
        votesAndCommits.votes[0][1],
        votesAndCommits.salts[0][1],
        { from: participants[1].address },
      );
      await contracts.daoVoting.revealVoteOnSpecialProposal(
        specialProposalId,
        votesAndCommits.votes[0][2],
        votesAndCommits.salts[0][2],
        { from: participants[2].address },
      );

      const readVote0 = await contracts.daoSpecialStorage.readVote.call(specialProposalId, participants[0].address);
      const readVote1 = await contracts.daoSpecialStorage.readVote.call(specialProposalId, participants[1].address);
      const readVote2 = await contracts.daoSpecialStorage.readVote.call(specialProposalId, participants[2].address);
      assert.deepEqual(readVote0[0], votesAndCommits.votes[0][0]);
      assert.deepEqual(readVote1[0], votesAndCommits.votes[0][1]);
      assert.deepEqual(readVote2[0], votesAndCommits.votes[0][2]);
      assert.deepEqual(readVote0[1], participants[0].dgdToLock);
      assert.deepEqual(readVote1[1], participants[1].dgdToLock);
      assert.deepEqual(readVote2[1], participants[2].dgdToLock);
    });
    it('[revealing after already having revealed]: revert', async function () {
      assert(await a.failure(contracts.daoVoting.revealVoteOnSpecialProposal.call(
        specialProposalId,
        votesAndCommits.votes[0][0],
        votesAndCommits.salts[0][0],
        { from: participants[0].address },
      )));
      assert(await a.failure(contracts.daoVoting.revealVoteOnSpecialProposal.call(
        specialProposalId,
        votesAndCommits.votes[0][1],
        votesAndCommits.salts[0][1],
        { from: participants[1].address },
      )));
      assert(await a.failure(contracts.daoVoting.revealVoteOnSpecialProposal.call(
        specialProposalId,
        votesAndCommits.votes[0][2],
        votesAndCommits.salts[0][2],
        { from: participants[2].address },
      )));
    });
    it('[revealing after the reveal phase]: revert', async function () {
      // wait for 10 seconds
      await waitFor(10, addressOf, web3);

      assert(await a.failure(contracts.daoVoting.revealVoteOnSpecialProposal.call(
        specialProposalId,
        votesAndCommits.votes[0][3],
        votesAndCommits.salts[0][3],
        { from: participants[3].address },
      )));
    });
  });

  describe('claimSpecialProposalVotingResult', function () {
    let specialProposalId1;
    let specialProposalId2;
    let specialProposalId3;
    let mockParticipants;
    before(async function () {
      await resetBeforeEach();
      const uintConfigs = await contracts.daoConfigsStorage.readUintConfigs.call();
      const uintConfigs2 = await contracts.daoConfigsStorage.readUintConfigs.call();
      specialProposalId1 = randomBytes32();
      specialProposalId2 = randomBytes32();
      specialProposalId3 = randomBytes32();
      uintConfigs[24] = bN(5);
      uintConfigs2[12] = bN(53);
      await contracts.daoSpecialStorage.mock_put_proposal_as(
        specialProposalId1,
        addressOf.founderBadgeHolder,
        uintConfigs,
        [],
        [],
        bN(getCurrentTimestamp()).minus(bN(15)),
      );
      await contracts.daoSpecialStorage.mock_put_proposal_as(
        specialProposalId2,
        addressOf.founderBadgeHolder,
        uintConfigs2,
        [],
        [],
        bN(getCurrentTimestamp()).minus(bN(20)),
      );
      await contracts.daoSpecialStorage.mock_put_proposal_as(
        specialProposalId3,
        addressOf.founderBadgeHolder,
        uintConfigs,
        [],
        [],
        bN(getCurrentTimestamp()).minus(bN(20)),
      );
      // mock add participants
      mockParticipants = randomAddresses(50);
      const mockStakes = randomBigNumbers(bN, 50, 100e9);
      for (const i in indexRange(0, 50)) {
        mockStakes[i] = mockStakes[i].plus(bN(10e9));
      }
      const mockWinningVotes = new Array(50);
      mockWinningVotes.fill(true);
      mockWinningVotes[4] = false; // set index 4 to false
      const mockLosingVotes = new Array(50);
      mockLosingVotes.fill(false);
      mockLosingVotes[4] = true; // set index 4 to true
      await contracts.daoStakeStorage.mock_add_participants(
        mockParticipants,
        mockStakes,
      );
      await contracts.daoSpecialStorage.mock_put_past_votes(
        specialProposalId1,
        mockParticipants,
        mockWinningVotes,
        mockStakes,
        bN(50),
      );
      await contracts.daoSpecialStorage.mock_put_past_votes(
        specialProposalId2,
        mockParticipants,
        mockLosingVotes,
        mockStakes,
        bN(50),
      );
      await contracts.daoSpecialStorage.mock_put_past_votes(
        specialProposalId3,
        mockParticipants,
        mockWinningVotes,
        mockStakes,
        bN(50),
      );

      // set the deadline to be 1 minute (just to be on the safer side)
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE, bN(600));
    });
    it('[if trying to claim before the voting phase is over]: revert', async function () {
      assert(await a.failure(contracts.daoSpecialVotingClaims.claimSpecialProposalVotingResult.call(
        specialProposalId1,
        bN(10),
        { from: addressOf.founderBadgeHolder },
      )));
    });
    it('[if claimer is not the founder]: revert', async function () {
      // wait for 5 seconds
      await waitFor(5, addressOf, web3);

      assert(await a.failure(contracts.daoSpecialVotingClaims.claimSpecialProposalVotingResult.call(
        specialProposalId1,
        bN(10),
        { from: addressOf.badgeHolders[0] },
      )));
    });
    it('[claim step by step (operations)]', async function () {
      // 50 people have voted (will require 5 steps if 12 in each batch)
      for (const i of indexRange(0, 4)) {
        assert.deepEqual(await contracts.daoSpecialVotingClaims.claimSpecialProposalVotingResult.call(
          specialProposalId1,
          bN(12),
          { from: addressOf.founderBadgeHolder },
        ), false);
        const tx = await contracts.daoSpecialVotingClaims.claimSpecialProposalVotingResult(
          specialProposalId1,
          bN(12),
          { from: addressOf.founderBadgeHolder },
        );
        assert.equal(tx.logs.length, 0);
        console.log('done iteration ', i);
      }
      // this claim should now pass the special proposal
      assert.deepEqual(await contracts.daoSpecialVotingClaims.claimSpecialProposalVotingResult.call(
        specialProposalId1,
        bN(12),
        { from: addressOf.founderBadgeHolder },
      ), true);
      const tx = await contracts.daoSpecialVotingClaims.claimSpecialProposalVotingResult(
        specialProposalId1,
        bN(12),
        { from: addressOf.founderBadgeHolder },
      );
      assert.deepEqual(tx.logs[0].event, 'SpecialProposalClaim');
      assert.deepEqual(tx.logs[0].args._proposalId, specialProposalId1);
      assert.deepEqual(tx.logs[0].args._result, true);

      // verify results
      assert.deepEqual(await contracts.daoSpecialStorage.isClaimed.call(specialProposalId1), true);
      assert.deepEqual(await contracts.daoSpecialStorage.readVotingResult.call(specialProposalId1), true);
      const readUintConfigs = await contracts.daoConfigsStorage.readUintConfigs.call();
      assert.deepEqual(readUintConfigs[24], bN(5));

      // do it for the failing special proposal
      // since there are 55 participants in total (50 added, 4 participants, 1 founder)
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE, bN(600));
      await contracts.daoSpecialVotingClaims.claimSpecialProposalVotingResult(
        specialProposalId2,
        bN(30),
        { from: addressOf.founderBadgeHolder },
      );
      const tx2 = await contracts.daoSpecialVotingClaims.claimSpecialProposalVotingResult(
        specialProposalId2,
        bN(30),
        { from: addressOf.founderBadgeHolder },
      );
      assert.deepEqual(tx2.logs[0].event, 'SpecialProposalClaim');
      assert.deepEqual(tx2.logs[0].args._proposalId, specialProposalId2);
      assert.deepEqual(tx2.logs[0].args._result, false);

      assert.deepEqual(await contracts.daoSpecialStorage.readVotingResult.call(specialProposalId2), false);
      assert.deepEqual(await contracts.daoSpecialStorage.isClaimed.call(specialProposalId2), true);
      const readUintConfigs2 = await contracts.daoConfigsStorage.readUintConfigs.call();
      assert.notEqual(readUintConfigs2[12].toNumber(), 53);
    });
    it('[try to re-claim a claimed special proposal]: revert', async function () {
      assert(await a.failure(contracts.daoSpecialVotingClaims.claimSpecialProposalVotingResult.call(
        specialProposalId1,
        bN(10),
        { from: addressOf.founderBadgeHolder },
      )));
    });
    it('[claim after the claim deadline]: any address can claim (fixed voting result set --> false)', async function () {
      // set the deadline to 5 seconds (that means the deadline has now passed)
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE, bN(5));

      // according to the votes, specialProposalId3 should be passing
      // but since deadline has already passed (it should be forced to fail)
      // anybody can claim this voting
      assert.deepEqual(await contracts.daoSpecialVotingClaims.claimSpecialProposalVotingResult.call(
        specialProposalId3,
        bN(10),
        { from: addressOf.badgeHolders[0] },
      ), false);
      await contracts.daoSpecialVotingClaims.claimSpecialProposalVotingResult(
        specialProposalId3,
        bN(10),
        { from: addressOf.badgeHolders[0] },
      );

      // verify results
      assert.deepEqual(await contracts.daoSpecialStorage.readVotingResult.call(specialProposalId3), false);
      assert.deepEqual(await contracts.daoSpecialStorage.isClaimed.call(specialProposalId3), false);
    });
  });

  describe('voteOnDraft', function () {
    before(async function () {
      await resetBeforeEach();
      // add some dummy proposals and endorse them
      await addProposal(contracts, proposals[0]);
      await addProposal(contracts, proposals[1]);
      await endorseProposal(contracts, proposals[0]);
      await endorseProposal(contracts, proposals[1]);
      // modify proposals[0] to the next version, i.e. versions[1]
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
      const currentQuarterNumber = bN(1);
      // note the moderator quarter points before voting in this draft voting round
      const qpBefore0 = await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[0], currentQuarterNumber);
      const qpBefore1 = await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[1], currentQuarterNumber);

      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      // put votes
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
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[0], currentQuarterNumber),
        qpBefore0.plus(daoConstantsValues(bN).CONFIG_QUARTER_POINT_DRAFT_VOTE.times(bN(2))),
      );
      assert.deepEqual(
        await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[1], currentQuarterNumber),
        qpBefore1.plus(daoConstantsValues(bN).CONFIG_QUARTER_POINT_DRAFT_VOTE.times(bN(2))),
      );
    });
    it('[modify votes]: success | verify read functions', async function () {
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);
      const currentQuarterNumber = bN(1);
      const qpBefore0 = await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[0], currentQuarterNumber);
      const qpBefore1 = await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[1], currentQuarterNumber);

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

      assert.deepEqual(await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[0], currentQuarterNumber), qpBefore0);
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterModeratorPoint.call(addressOf.badgeHolders[1], currentQuarterNumber), qpBefore1);

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
      // assert.deepEqual(await contracts.daoStakeLocking.isMainPhase.call(), true);
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
      assert.isAtLeast(voteCount0[0].plus(voteCount0[1]).toNumber(), minimumDraftQuorum.toNumber());
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
    it('[if voting before draft voting phase ends | quorum is not met]: claimed true, passed false, collateral refunded', async function () {
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
      assert.isBelow(voteCount3[0].plus(voteCount3[1]).toNumber(), minimumDraftQuorum.toNumber());
      const ethBalanceBefore = await web3.eth.getBalance(proposals[3].proposer);
      const tx = await contracts.daoVotingClaims.claimDraftVotingResult(proposals[3].id, bN(20), { from: proposals[3].proposer, gasPrice: web3.toWei(20, 'gwei') });
      const gasUsed = tx.receipt.gasUsed * web3.toWei(20, 'gwei');
      assert.deepEqual(await web3.eth.getBalance(proposals[3].proposer), ethBalanceBefore.plus(bN(2 * (10 ** 18))).minus(bN(gasUsed)));
      assert.deepEqual(await contracts.daoStorage.readProposalDraftVotingResult.call(proposals[3].id), false);
      assert.deepEqual(await contracts.daoStorage.isDraftClaimed.call(proposals[3].id), true);
      assert.deepEqual(await contracts.daoStorage.readProposalCollateralStatus.call(proposals[3].id), collateralStatus(bN).COLLATERAL_STATUS_CLAIMED);
    });
    it('[if quota is not met]: claimed true, passed false, collateral refunded', async function () {
      const voteCount2 = await contracts.daoStorage.readDraftVotingCount.call(proposals[2].id, addressOf.allParticipants);
      const minimumDraftQuorum = await contracts.daoCalculatorService.minimumDraftQuorum.call(proposals[2].id);
      assert.isAtLeast(voteCount2[0].plus(voteCount2[1]).toNumber(), minimumDraftQuorum.toNumber());
      assert.deepEqual(await contracts.daoCalculatorService.draftQuotaPass.call(voteCount2[0], voteCount2[1]), false);
      const ethBalanceBefore = await web3.eth.getBalance(proposals[2].proposer);
      const tx = await contracts.daoVotingClaims.claimDraftVotingResult(proposals[2].id, bN(20), { from: proposals[2].proposer, gasPrice: web3.toWei(20, 'gwei') });
      const gasUsed = tx.receipt.gasUsed * web3.toWei(20, 'gwei');
      assert.deepEqual(await web3.eth.getBalance(proposals[2].proposer), ethBalanceBefore.plus(bN(2 * (10 ** 18))).minus(bN(gasUsed)));
      assert.deepEqual(await contracts.daoStorage.readProposalDraftVotingResult.call(proposals[2].id), false);
      assert.deepEqual(await contracts.daoStorage.isDraftClaimed.call(proposals[2].id), true);
      assert.deepEqual(await contracts.daoStorage.readProposalCollateralStatus.call(proposals[2].id), collateralStatus(bN).COLLATERAL_STATUS_CLAIMED);
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
      const minimumDraftQuorum = await contracts.daoCalculatorService.minimumDraftQuorum.call(proposals[0].id);
      assert.isAtLeast(voteCount0[0].plus(voteCount0[1]).toNumber(), minimumDraftQuorum.toNumber());
      assert.deepEqual(await contracts.daoCalculatorService.draftQuotaPass.call(voteCount0[0], voteCount0[1]), true);
      assert.deepEqual(await contracts.daoStorage.readProposalDraftVotingResult.call(proposals[0].id), false);

      // conditions met, claim the draft voting results
      const returnValues = await contracts.daoVotingClaims.claimDraftVotingResult.call(proposals[0].id, bN(50), { from: proposals[0].proposer });
      assert.deepEqual(returnValues[0], true);
      assert.deepEqual(returnValues[1], true);

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
    it('[founder/any other person cannot claim before the voting deadline is over, anybody can claim after deadline (default result fail and collateral refunded to proposer)]', async function () {
      await resetBeforeEach();
      const participants = getParticipants(addressOf, bN);
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[0].id,
        bN(101),
        true,
        proposals[0].proposer,
        proposals[0].endorser,
        proposals[0].versions[0].milestoneFundings,
        proposals[0].versions[0].finalReward,
      );
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(101),
        true,
        [participants[0].address, participants[1].address, participants[2].address, participants[3].address],
        [true, true, true, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(101),
      );

      // wait for draft voting phase
      await waitFor(5, addressOf, web3);

      // before the deadline, founder/other participants try to claim
      assert(await a.failure(contracts.daoVotingClaims.claimDraftVotingResult(
        proposals[0].id,
        bN(20),
        { from: addressOf.founderBadgeHolder },
      )));
      assert(await a.failure(contracts.daoVotingClaims.claimDraftVotingResult(
        proposals[0].id,
        bN(20),
        { from: proposals[1].proposer },
      )));

      // but the proposer can claim
      assert.ok(await contracts.daoVotingClaims.claimDraftVotingResult.call(
        proposals[0].id,
        bN(20),
        { from: proposals[0].proposer },
      ));

      // wait for deadline
      await waitFor(6, addressOf, web3);

      // now proposer/founder/any participant can claim and by default the result will fail
      const claimResultProposer = await contracts.daoVotingClaims.claimDraftVotingResult.call(
        proposals[0].id,
        bN(20),
        { from: proposals[0].proposer },
      );
      const claimResultFounder = await contracts.daoVotingClaims.claimDraftVotingResult.call(
        proposals[0].id,
        bN(20),
        { from: addressOf.founderBadgeHolder },
      );
      const claimResultParticipant = await contracts.daoVotingClaims.claimDraftVotingResult.call(
        proposals[0].id,
        bN(20),
        { from: proposals[1].proposer },
      );
      assert.deepEqual(claimResultProposer, [false, true]);
      assert.deepEqual(claimResultFounder, [false, true]);
      assert.deepEqual(claimResultParticipant, [false, true]);

      const ethBalanceBefore = await web3.eth.getBalance(proposals[0].proposer);
      await contracts.daoVotingClaims.claimDraftVotingResult(
        proposals[0].id,
        bN(20),
        { from: proposals[1].proposer },
      );

      assert.deepEqual(await web3.eth.getBalance(proposals[0].proposer), ethBalanceBefore.plus(bN(2 * (10 ** 18))));
      assert.deepEqual(await contracts.daoStorage.readProposalCollateralStatus.call(proposals[0].id), collateralStatus(bN).COLLATERAL_STATUS_CLAIMED);
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
        proposals[3].versions[0].milestoneFundings,
        proposals[3].versions[0].finalReward,
      );
      votesAndCommits = assignVotesAndCommits(addressOf);
    });
    it('[if invalid proposal state for voting round]: revert', async function () {
      // the voter is a participant
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.allParticipants[0]), true);
      // the commitvote call reverts as the proposal is not in the voting phase
      assert(await a.failure(contracts.daoVoting.commitVoteOnProposal(
        proposals[2].id,
        bN(0),
        votesAndCommits.votingCommits[2][0],
        { from: addressOf.allParticipants[0] },
      )));
    });
    it('[if called by non-participant]: revert', async function () {
      // if the account trying to vote is not a participant
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.allParticipants[2]), false);
      // this call should revert for a proposal which is in the voting commit phase
      assert(await a.failure(contracts.daoVoting.commitVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votingCommits[0][2],
        { from: addressOf.allParticipants[2] },
      )));
    });
    it('[valid commit vote]: verify read functions', async function () {
      // valid commits
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
      // verify if the commited votes have been stored correctly
      assert.deepEqual(await contracts.daoStorage.readComittedVote.call(proposals[0].id, bN(0), addressOf.allParticipants[0]), votesAndCommits.votingCommits[0][0]);
      assert.deepEqual(await contracts.daoStorage.readComittedVote.call(proposals[1].id, bN(0), addressOf.allParticipants[1]), votesAndCommits.votingCommits[1][1]);

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
      // update the previously committed vote
      await contracts.daoVoting.commitVoteOnProposal(
        proposals[0].id,
        bN(0),
        commitPrime,
        { from: addressOf.allParticipants[0] },
      );
      // verify that the commit is the latest commit
      // overwrites the previous commit
      assert.deepEqual(await contracts.daoStorage.readComittedVote.call(proposals[0].id, bN(0), addressOf.allParticipants[0]), commitPrime);
    });
    it('[if not voting commit phase]: revert', async function () {
      // wait for commit phase to get over
      const commitPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTING_COMMIT_PHASE);
      const timeToWaitFor = commitPhaseDuration.toNumber() - (getCurrentTimestamp() - startTime);
      await waitFor(timeToWaitFor, addressOf, web3);
      // the voter is a participant
      assert.deepEqual(await contracts.daoStakeStorage.isInParticipantList.call(addressOf.allParticipants[4]), true);
      // since the commit phase has ended, calling commitVote will revert
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
        proposals[2].versions[0].milestoneFundings,
        proposals[2].versions[0].finalReward,
      );
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[3].id,
        bN(1),
        false,
        proposals[3].proposer,
        proposals[3].endorser,
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
      // revert since its before the reveal phase begins
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
      const _quarterNumber = bN(1);
      const qpBefore0 = await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.allParticipants[0], _quarterNumber);
      const qpBefore1 = await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.allParticipants[1], _quarterNumber);

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
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.allParticipants[0], _quarterNumber), qpBefore0.plus(additionQP));
      assert.deepEqual(await contracts.daoPointsStorage.getQuarterPoint.call(addressOf.allParticipants[1], _quarterNumber), qpBefore1.plus(additionQP));

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
      // since this vote has already been revealed, this should revert
      assert(await a.failure(contracts.daoVoting.revealVoteOnProposal(
        proposals[0].id,
        bN(0),
        votesAndCommits.votes[0][0],
        votesAndCommits.salts[0][0],
        { from: addressOf.allParticipants[0] },
      )));
    });
  });

  describe('claimProposalVotingResult', function () {
    let participants;
    beforeEach(async function () {
      await resetBeforeEach();
      // set a high number for the vote claiming deadline, just to be sure it does not interfere with the test cases
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE, bN(300000));
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
        bN(getCurrentTimestamp()).minus(proposals[0].versions[0].milestoneDurations[0]).minus(bN(20)),
      );
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(1),
        false,
        [addressOf.allParticipants[0], addressOf.allParticipants[1], addressOf.allParticipants[4], addressOf.allParticipants[5]],
        [true, true, true, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp()),
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
        bN(getCurrentTimestamp()).minus(proposals[1].versions[0].milestoneDurations[0]).minus(bN(20)),
      );
      await contracts.daoStorage.mock_put_past_votes(
        proposals[1].id,
        bN(1),
        false,
        [addressOf.allParticipants[0], addressOf.allParticipants[1], addressOf.allParticipants[4], addressOf.allParticipants[5]],
        [true, true, false, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp()),
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
        bN(getCurrentTimestamp()),
      );
    });
    it('[if claiming before reveal phase ends]: revert', async function () {
      // voting result can only be claimed after the reveal phase
      // and before the vote claiming deadline
      assert(await a.failure(contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[0].id,
        bN(1),
        bN(20),
        { from: proposals[0].proposer },
      )));
    });
    it('[if non-proposer claims]: revert', async function () {
      // now wait for the interim phase to get over
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);

      // within the deadline, only the proposer can claim the voting result
      // if anybody else tries to claim the result, it should revert
      await a.map(indexRange(1, 6), 20, async (i) => {
        if (addressOf.allParticipants[i] === proposals[0].proposer) return;
        assert(await a.failure(contracts.daoVotingClaims.claimProposalVotingResult(
          proposals[0].id,
          bN(1),
          bN(20),
          { from: addressOf.allParticipants[i] },
        )));
        if (addressOf.allParticipants[i] === proposals[1].proposer) return;
        assert(await a.failure(contracts.daoVotingClaims.claimProposalVotingResult(
          proposals[1].id,
          bN(1),
          bN(20),
          { from: addressOf.allParticipants[i] },
        )));
      });
    });
    it('[voting round - if quota is not met]: returns false', async function () {
      // now wait for the interim phase to get over
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);

      // note that the proposal voting has not been claimed yet
      assert.deepEqual(await contracts.daoStorage.isClaimed.call(proposals[2].id, bN(0)), false);

      // claim the voting result
      // it should return false coz the quota is not met
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

      // the claimed boolean must be set to true coz its claimed now
      assert.deepEqual(await contracts.daoStorage.isClaimed.call(proposals[2].id, bN(0)), true);
    });
    it('[first voting round - passes, counter should increment]', async function () {
      await contracts.daoStorage.mock_put_past_votes(
        proposals[2].id,
        bN(0),
        false,
        [addressOf.allParticipants[0], addressOf.allParticipants[1], addressOf.allParticipants[4], addressOf.allParticipants[5]],
        [true, true, true, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp()),
      );

      // now wait for the interim phase to get over
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);

      // note that the proposal voting has not been claimed yet
      assert.deepEqual(await contracts.daoStorage.isClaimed.call(proposals[2].id, bN(0)), false);

      // claim the voting result
      // it should return false coz the quota is not met
      const claimRes = await contracts.daoVotingClaims.claimProposalVotingResult.call(
        proposals[2].id,
        bN(0),
        bN(10),
        { from: proposals[2].proposer },
      );
      assert.deepEqual(claimRes[0], true); // claim pass
      assert.deepEqual(claimRes[1], true); // claim process done

      // get the number of proposals before claiming this one
      const proposalCounterBefore = await contracts.daoProposalCounterStorage.proposalCountByQuarter.call(bN(1));

      await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[2].id,
        bN(0),
        bN(10),
        { from: proposals[2].proposer },
      );

      // proposal counter must increment
      assert.deepEqual(await contracts.daoProposalCounterStorage.proposalCountByQuarter.call(bN(1)), proposalCounterBefore.plus(bN(1)));
    });
    it('[valid claim, check bonuses]: verify read functions', async function () {
      // now wait for the interim phase to get over
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);

      // values before claiming
      const qpBefore0 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[0]);
      const qpBefore1 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[1]);
      const qpBefore4 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[4]);
      const qpBefore5 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[5]);

      // claim the result
      await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[0].id,
        bN(1),
        bN(10),
        { from: proposals[0].proposer },
      );

      // voting result set
      assert.deepEqual(await contracts.daoStorage.readProposalVotingResult.call(proposals[0].id, bN(1)), true);

      // claimed is set
      assert.deepEqual(await contracts.daoStorage.isClaimed.call(proposals[0].id, bN(1)), true);

      // check bonus reputation awarded
      const bonusRP = getBonusReputation(
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_VOTE,
        daoConstantsValues(bN).CONFIG_BONUS_REPUTATION_NUMERATOR,
        daoConstantsValues(bN).CONFIG_BONUS_REPUTATION_DENOMINATOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_NUM,
        daoConstantsValues(bN).CONFIG_REPUTATION_PER_EXTRA_QP_DEN,
      );
      // since 4 and 5 did not vote correctly, there is no boost for reputation
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[4]), qpBefore4);
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[5]), qpBefore5);
      // since 0 and 1 voted correctly, there is a boost of reputation
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[0]), qpBefore0.plus(bN(bonusRP)));
      assert.deepEqual(await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[1]), qpBefore1.plus(bN(bonusRP)));
    });
    it('[valid claim, verify bonuses]: verify', async function () {
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);

      // values before claiming
      const qpBefore0 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[0]);
      const qpBefore1 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[1]);
      const qpBefore4 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[4]);
      const qpBefore5 = await contracts.daoPointsStorage.getReputation.call(addressOf.allParticipants[5]);

      await contracts.daoVotingClaims.claimProposalVotingResult(proposals[1].id, bN(1), bN(10), { from: proposals[1].proposer });

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
        bN(1),
        false,
        proposals[3].proposer,
        proposals[3].endorser,
        proposals[3].versions[0].milestoneFundings,
        proposals[3].versions[0].finalReward,
      );
      await contracts.daoStorage.mock_put_past_votes(
        proposals[3].id,
        bN(1),
        false,
        [addressOf.allParticipants[0], addressOf.allParticipants[1], addressOf.allParticipants[4], addressOf.allParticipants[5]],
        [true, true, true, false],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp()),
      );

      // wait for the interim voting phase to get over
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);

      // set the vote claiming deadline to be a high number
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE, bN(1000000));

      // note the quarter point before
      const qpBefore = await contracts.daoPointsStorage.getQuarterPoint.call(proposals[3].proposer, bN(1));

      // note the eth balance before
      const ethBalanceBefore = await web3.eth.getBalance(proposals[3].proposer);
      const tx = await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[3].id,
        bN(1),
        bN(10),
        { from: proposals[3].proposer, gasPrice: web3.toWei(20, 'gwei') },
      );

      // proposal should now be moved to the archived state
      const readProposal = await contracts.daoStorage.readProposal.call(proposals[3].id);
      assert.deepEqual(readProposal[3], paddedHex(web3, proposalStates().PROPOSAL_STATE_ARCHIVED));
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates().PROPOSAL_STATE_ARCHIVED), proposals[3].id);

      const gasUsed = tx.receipt.gasUsed * web3.toWei(20, 'gwei');
      // since it was the final voting round, and the voting is passing, the eth collateral should be released back
      assert.deepEqual(await web3.eth.getBalance(proposals[3].proposer), ethBalanceBefore.plus(bN(2 * (10 ** 18))).minus(bN(gasUsed)));

      // also the proposer should get the quarter point for milestone completion
      assert(await contracts.daoPointsStorage.getQuarterPoint.call(proposals[3].proposer, bN(1)), qpBefore.plus(daoConstantsValues(bN).CONFIG_QUARTER_POINT_MILESTONE_COMPLETION_PER_10000ETH));
    });
    it('[re-claim same voting round]: revert', async function () {
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);
      // claim both voting rounds
      await contracts.daoVotingClaims.claimProposalVotingResult(proposals[0].id, bN(1), bN(10), { from: proposals[0].proposer });
      await contracts.daoVotingClaims.claimProposalVotingResult(proposals[1].id, bN(1), bN(10), { from: proposals[1].proposer });

      // reverts if tried to reclaim the proposal voting result
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

      const claimResult = await contracts.daoVotingClaims.claimProposalVotingResult.call(
        proposals[0].id,
        bN(1),
        bN(10),
        { from: addressOf.allParticipants[5] },
      );
      assert.deepEqual(claimResult[0], false);
      assert.deepEqual(claimResult[1], true);

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
    it('[only enough _operations so that votes are counted (but bonus not calculated)]: eth cannot be claimed', async function () {
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

      assert.deepEqual(await contracts.daoStorage.isClaimed.call(proposals[0].id, bN(1)), false);
      assert.deepEqual(await contracts.daoStorage.readProposalVotingResult.call(proposals[0].id, bN(1)), false);

      assert(await a.failure(contracts.daoFundingManager.claimFunding(
        proposals[0].id,
        bN(1),
        { from: proposals[0].proposer },
      )));
    });
    it('[before the vote claiming deadline, founder/participants cannot claim voting (only proposer can)]', async function () {
      // now wait for the interim phase to get over
      const interimVotingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_INTERIM_PHASE_TOTAL);
      await waitFor(interimVotingPhaseDuration.toNumber() + 1, addressOf, web3);

      // check that the proposer can claim
      assert.ok(await contracts.daoVotingClaims.claimProposalVotingResult.call(
        proposals[0].id,
        bN(1),
        bN(10),
        { from: proposals[0].proposer },
      ));

      // check that founder claiming reverts (within the deadline)
      assert(await a.failure(contracts.daoVotingClaims.claimProposalVotingResult.call(
        proposals[0].id,
        bN(1),
        bN(10),
        { from: addressOf.founderBadgeHolder },
      )));

      // wait for 5 seconds for the deadline to get over with
      await waitFor(5, addressOf, web3);

      assert.ok(await contracts.daoVotingClaims.claimProposalVotingResult.call(
        proposals[0].id,
        bN(1),
        bN(10),
        { from: proposals[0].proposer },
      ));
    });
    it('[if the voting round is failing, the proposer must receive collateral back]', async function () {
      // now wait for the voting phase to get over
      const votingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_VOTING_PHASE_TOTAL);
      await waitFor(votingPhaseDuration.toNumber() + 1, addressOf, web3);

      // make sure that all operations are done, and voting is failing
      const claimResult = await contracts.daoVotingClaims.claimProposalVotingResult.call(
        proposals[2].id,
        bN(0),
        bN(20),
        { from: proposals[2].proposer },
      );
      assert.deepEqual(claimResult[0], false);
      assert.deepEqual(claimResult[1], true);

      const ethBalanceBefore = await web3.eth.getBalance(proposals[2].proposer);
      const tx = await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[2].id,
        bN(0),
        bN(20),
        { from: proposals[2].proposer, gasPrice: web3.toWei(20, 'gwei') },
      );
      const gasUsed = tx.receipt.gasUsed * web3.toWei(20, 'gwei');
      // proposer gets back the collateral
      assert.deepEqual(await web3.eth.getBalance(proposals[2].proposer), ethBalanceBefore.plus(bN(2 * (10 ** 18))).minus(gasUsed));

      // voting result is set to false, it is claimed and the collateral has been claimed also
      assert.deepEqual(await contracts.daoStorage.readProposalVotingResult.call(proposals[2].id, bN(0)), false);
      assert.deepEqual(await contracts.daoStorage.isClaimed.call(proposals[2].id, bN(0)), true);
      assert.deepEqual(await contracts.daoStorage.readProposalCollateralStatus.call(proposals[2].id), collateralStatus(bN).COLLATERAL_STATUS_CLAIMED);
    });
    it('[if first round of voting passes, the collateral is locked]', async function () {
      const participants = getParticipants(addressOf, bN);
      // add a proposal in the first voting round
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[3].id,
        bN(0),
        false,
        proposals[3].proposer,
        proposals[3].endorser,
        proposals[3].versions[0].milestoneFundings,
        proposals[3].versions[0].finalReward,
      );
      // add some dummy votes
      await contracts.daoStorage.mock_put_past_votes(
        proposals[3].id,
        bN(0),
        false,
        [participants[0].address, participants[1].address, participants[2].address, participants[3].address],
        [true, true, true, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp()).minus(bN(20)),
      );

      // claim the proposal, the collateral should be locked (since it is passing)
      // this collateral can be freed only if the proposer finishes all milestones
      await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[3].id,
        bN(0),
        bN(20),
        { from: proposals[3].proposer },
      );

      // verify the read functions
      assert.deepEqual(await contracts.daoStorage.readProposalVotingResult.call(proposals[3].id, bN(0)), true);
      assert.deepEqual(await contracts.daoStorage.isClaimed.call(proposals[3].id, bN(0)), true);
      assert.deepEqual(await contracts.daoStorage.readProposalCollateralStatus.call(proposals[3].id), collateralStatus(bN).COLLATERAL_STATUS_LOCKED);
    });
  });

  describe('updatePRL', function () {
    let participants;
    beforeEach(async function () {
      await resetBeforeEach();
      participants = getParticipants(addressOf, bN);
      // create a dummy proposal in the draft voting phase
      await contracts.daoStorage.mock_put_proposal_as(
        proposals[0].id,
        bN(0),
        true,
        proposals[0].proposer,
        proposals[0].endorser,
        proposals[0].versions[1].milestoneFundings,
        proposals[0].versions[1].finalReward,
      );
      // add votes for the draft voting round
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
      // wait for draft voting phase to get done
      await waitFor(5, addressOf, web3);
      await contracts.daoVotingClaims.claimDraftVotingResult(proposals[0].id, bN(20), { from: proposals[0].proposer });
      // set a rediculous claiming deadline so it wont be exceeded in claiming voting result
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE, bN(50));
    });
    it('[non-prl calls function]: revert', async function () {
      // only the prl account can call the prl functions
      // in case of others it should revert
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
      // in case of any other action, the function call must revert
      assert(await a.failure(contracts.dao.updatePRL(
        proposals[0].id,
        bN(4),
        'some:bytes',
        { from: addressOf.prl },
      )));
    });
    it('[pause a proposal during voting phase]: cannot claim eth | milestone starts at unpause time', async function () {
      // get votes, salts and commits
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

      // verify that the above prl action has been stored correctly
      assert.deepEqual(await contracts.daoStorage.readTotalPrlActions.call(proposals[0].id), bN(1));
      const action0 = await contracts.daoStorage.readPrlAction.call(proposals[0].id, bN(0));
      assert.deepEqual(action0[0], bN(2)); // pause
      assert.deepEqual(timeIsRecent(action0[1], 5), true);
      assert.deepEqual(action0[2], paddedHex(web3, 'pausing:proposal'));

      // wait for reveal phase to get over
      await waitFor(10, addressOf, web3);

      console.log('\t\tProposal count = ', await contracts.daoProposalCounterStorage.proposalCountByQuarter(bN(2)));

      // claim the voting result
      await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[0].id,
        bN(0),
        bN(30),
        { from: proposals[0].proposer },
      );

      console.log('\t\tVoting result = ', await contracts.daoStorage.readProposalVotingResult.call(proposals[0].id, bN(0)));
      console.log('\t\tIs claimed = ', await contracts.daoStorage.isClaimed.call(proposals[0].id, bN(0)));

      // proposer shouldn't be able to claim eth (since proposal paused)

      assert(await a.failure(contracts.daoFundingManager.claimFunding(
        proposals[0].id,
        bN(0),
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

      // can now claim ether
      console.log('Before claimFunding');
      await printDaoDetails(bN, contracts);
      assert.ok(await contracts.daoFundingManager.claimFunding.call(
        proposals[0].id,
        bN(0),
        { from: proposals[0].proposer },
      ));
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
        bN(getCurrentTimestamp()),
      );
      // wait for voting phase
      await waitFor(20, addressOf, web3);
      // claim the result
      await contracts.daoVotingClaims.claimProposalVotingResult(proposals[0].id, bN(0), bN(10), { from: proposals[0].proposer });

      // stop the proposal
      // after its stopped, the proposer should not be allowed to claim any funding
      await contracts.dao.updatePRL(proposals[0].id, bN(1), 'stop:proposal[0]', { from: addressOf.prl });

      // claim the funding
      // this should revert as the proposal is stopped
      assert(await a.failure(contracts.daoFundingManager.claimFunding(
        proposals[0].id,
        bN(0),
        proposals[0].versions[1].milestoneFundings[0],
        { from: proposals[0].proposer },
      )));
    });
    it('[stop a proposal, then no other action can be done on that proposal]', async function () {
      // check that the proposal is in moderated phase
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_MODERATED), proposals[0].id);
      // prl stops the proposal
      await contracts.dao.updatePRL(proposals[0].id, bN(1), 'stop:proposal', { from: addressOf.prl });
      // verify that the proposal has been moved to the closed state
      const readProposal = await contracts.daoStorage.readProposal.call(proposals[0].id);
      assert.deepEqual(readProposal[3], paddedHex(web3, proposalStates().PROPOSAL_STATE_CLOSED));
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_MODERATED), EMPTY_BYTES);
      assert.deepEqual(await contracts.daoStorage.getFirstProposalInState.call(proposalStates().PROPOSAL_STATE_CLOSED), proposals[0].id);

      assert(await a.failure(contracts.dao.updatePRL(proposals[0].id, bN(1), 'again:stop', { from: addressOf.prl })));
      assert(await a.failure(contracts.dao.updatePRL(proposals[0].id, bN(2), 'try:pause', { from: addressOf.prl })));
      assert(await a.failure(contracts.dao.updatePRL(proposals[0].id, bN(3), 'try:unpause', { from: addressOf.prl })));
    });
  });

  describe('changeFundings', function () {
    beforeEach(async function () {
      await resetBeforeEach();

      // create and endorse new proposal
      await addProposal(contracts, proposals[0]);
      await endorseProposal(contracts, proposals[0]);

      // add proposal in the first milestone (with 2 milestones)
      await contracts.daoStorage.mock_put_proposal_in_milestone(
        proposals[1].id,
        bN(0),
        proposals[1].proposer,
        proposals[1].endorser,
        proposals[1].versions[0].milestoneFundings,
        proposals[1].versions[0].finalReward,
        bN(getCurrentTimestamp()).minus(bN(40)),
      );

      // add proposal in the first milestone (with 1 milestone)
      await contracts.daoStorage.mock_put_proposal_in_milestone(
        proposals[3].id,
        bN(0),
        proposals[3].proposer,
        proposals[3].endorser,
        proposals[3].versions[0].milestoneFundings,
        proposals[3].versions[0].finalReward,
        bN(getCurrentTimestamp()).minus(bN(40)),
      );
    });
    it('[not called by proposer]: revert', async function () {
      // the params are valid, but the msg.sender is not the proposer
      assert(await a.failure(contracts.dao.changeFundings.call(
        proposals[1].id,
        proposals[1].versions[1].milestoneFundings,
        proposals[1].versions[1].finalReward,
        bN(0),
        { from: proposals[0].proposer },
      )));
    });
    it('[proposer\'s KYC has expired]: revert', async function () {
      // expire the KYC for proposer
      await contracts.daoIdentity.updateKyc(
        proposals[1].proposer,
        'expiring',
        bN(getCurrentTimestamp()).minus(bN(1)),
        { from: addressOf.kycadmin },
      );

      // changing fundings should fail
      assert(await a.failure(contracts.dao.changeFundings.call(
        proposals[1].id,
        proposals[1].versions[1].milestoneFundings,
        proposals[1].versions[1].finalReward,
        bN(0),
        { from: proposals[1].proposer },
      )));
    });
    it('[proposer is not a participant in this quarter]: revert', async function () {
      // let this quarter pass
      await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
      await contracts.dgxToken.mintDgxFor(contracts.daoRewardsManager.address, bN(10 * (10 ** 18)));
      await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(20), { from: addressOf.founderBadgeHolder });

      // this proposer does not continue participation
      await phaseCorrection(web3, contracts, addressOf, phases.MAIN_PHASE);

      // now any change fundings should fail coz not a participant
      assert(await a.failure(contracts.dao.changeFundings.call(
        proposals[1].id,
        proposals[1].versions[2].milestoneFundings,
        proposals[1].versions[2].finalReward,
        bN(0),
        { from: proposals[1].proposer },
      )));
    });
    it('[proposal not yet finalized, once in voting phase, change the next milestone funding]: revert', async function () {
      // consider the new proposal (proposals[0])
      assert(await a.failure(contracts.dao.changeFundings.call(
        proposals[0].id,
        proposals[0].versions[1].milestoneFundings,
        proposals[0].versions[1].finalReward,
        bN(0),
        { from: proposals[0].proposer },
      )));

      // finalize the proposal
      await contracts.dao.finalizeProposal(proposals[0].id, { from: proposals[0].proposer });

      // since its only finalized yet, the function call must revert
      assert(await a.failure(contracts.dao.changeFundings.call(
        proposals[0].id,
        proposals[0].versions[1].milestoneFundings,
        proposals[0].versions[1].finalReward,
        bN(0),
        { from: proposals[0].proposer },
      )));

      // wait for draft voting to get over
      await waitFor(6, addressOf, web3);
      const participants = getParticipants(addressOf, bN);
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(101),
        true,
        [participants[0].address, participants[1].address, participants[2].address, participants[3].address],
        [true, true, true, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(101),
      );
      assert(await a.failure(contracts.dao.changeFundings.call(
        proposals[0].id,
        proposals[0].versions[1].milestoneFundings,
        proposals[0].versions[1].finalReward,
        bN(0),
        { from: proposals[0].proposer },
      )));

      // claim the draft voting phase
      await contracts.daoVotingClaims.claimDraftVotingResult(
        proposals[0].id,
        bN(10),
        { from: proposals[0].proposer },
      );
      assert(await a.failure(contracts.dao.changeFundings.call(
        proposals[0].id,
        proposals[0].versions[1].milestoneFundings,
        proposals[0].versions[1].finalReward,
        bN(0),
        { from: proposals[0].proposer },
      )));

      // wait for voting round
      await waitFor(21, addressOf, web3);
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(0),
        false,
        [participants[0].address, participants[1].address, participants[2].address, participants[3].address],
        [true, true, true, true],
        [participants[0].dgdToLock, participants[1].dgdToLock, participants[2].dgdToLock, participants[3].dgdToLock],
        bN(4),
        bN(getCurrentTimestamp()).minus(bN(21)),
      );

      // claim the voting results
      await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[0].id,
        bN(0),
        bN(10),
        { from: proposals[0].proposer },
      );

      // after the voting is claimed, the proposer must be allowed to change fundings
      // this function call should go through because according to the new version of fundings
      // the funding for milestone 1 is still the same
      // only the funding for subsequent milestones has been changed
      assert.ok(await contracts.dao.changeFundings(
        proposals[0].id,
        proposals[0].versions[1].milestoneFundings,
        proposals[0].versions[1].finalReward,
        bN(0),
        { from: proposals[0].proposer },
      ));
    });
    it('[proposal currently in the first milestone (just passed the voting round), change the first milestone funding]: revert', async function () {
      // versions[1] has the first funding also different than the previous version
      assert(await a.failure(contracts.dao.changeFundings.call(
        proposals[1].id,
        proposals[1].versions[1].milestoneFundings,
        proposals[1].versions[1].finalReward,
        bN(0),
        { from: proposals[1].proposer },
      )));
    });
    it('[proposal currently in the first milestone, change the second milestone funding]: success', async function () {
      // versions[2] has the first funding equal as the previous version
      assert.ok(await contracts.dao.changeFundings.call(
        proposals[1].id,
        proposals[1].versions[2].milestoneFundings,
        proposals[1].versions[2].finalReward,
        bN(0),
        { from: proposals[1].proposer },
      ));
      await contracts.dao.changeFundings(
        proposals[1].id,
        proposals[1].versions[2].milestoneFundings,
        proposals[1].versions[2].finalReward,
        bN(0),
        { from: proposals[1].proposer },
      );

      // verify new fundings, milestones
      const latestVersion = await contracts.daoStorage.getLastProposalVersion.call(proposals[1].id);
      const readLatestVersion = await contracts.daoStorage.readProposalVersion(proposals[1].id, latestVersion);
      assert.deepEqual(readLatestVersion[2][0], proposals[1].versions[2].milestoneFundings[0]);
      assert.deepEqual(readLatestVersion[2][1], proposals[1].versions[2].milestoneFundings[1]);
      assert.deepEqual(readLatestVersion[3], proposals[1].versions[2].finalReward);
    });
    it('[proposal currently in the first and only milestone, add a second milestone]: success', async function () {
      // proposals[3] is under consideration
      // add another milestone to the one and only milestone so far
      assert.ok(await contracts.dao.changeFundings.call(
        proposals[3].id,
        [proposals[3].versions[0].milestoneFundings[0], bN(3 * (10 ** 18))],
        bN(4 * (10 ** 18)),
        bN(0),
        { from: proposals[3].proposer },
      ));
      await contracts.dao.changeFundings(
        proposals[3].id,
        [proposals[3].versions[0].milestoneFundings[0], bN(3 * (10 ** 18))],
        bN(4 * (10 ** 18)),
        bN(0),
        { from: proposals[3].proposer },
      );

      // verify new fundings, milestones
      const latestVersion = await contracts.daoStorage.getLastProposalVersion.call(proposals[3].id);
      const readLatestVersion = await contracts.daoStorage.readProposalVersion(proposals[3].id, latestVersion);
      assert.deepEqual(readLatestVersion[2][0], proposals[3].versions[0].milestoneFundings[0]);
      assert.deepEqual(readLatestVersion[2][1], bN(3 * (10 ** 18)));
      assert.deepEqual(readLatestVersion[3], bN(4 * (10 ** 18)));
    });
    it('[proposer tries to add a third milestone]: revert', async function () {
      // since non-digix proposals cannot have more than capped milestones (which is 2 in the test suite)
      // adding a third milestone will revert
      assert(await a.failure(contracts.dao.changeFundings.call(
        proposals[1].id,
        [proposals[1].versions[0].milestoneFundings[0], bN(2 * (10 ** 18)), bN(2 * (10 ** 18))],
        bN(1 * (10 ** 18)),
        bN(0),
        { from: proposals[1].proposer },
      )));
    });
    it('[if the changed fundings are above the capped values]: revert', async function () {
      // also there is a max cap on the fundings that can be received by non-digix proposals
      // in the test suite, we set it to 20 ETH
      // trying to set a funding above that value should revert
      assert(await a.failure(contracts.dao.changeFundings.call(
        proposals[1].id,
        [proposals[1].versions[0].milestoneFundings[0], bN(15 * (10 ** 18))],
        bN(5 * (10 ** 18)),
        bN(0),
        { from: proposals[1].proposer },
      )));
    });
  });

  describe('addProposalDoc', function () {
    before(async function () {
      await resetBeforeEach();
      await addProposal(contracts, proposals[0]);
      await endorseProposal(contracts, proposals[0]);
    });
    it('[if adding more docs to a non-finalized proposal]: revert', async function () {
      // if the proposal is not finalized yet, it should be modified
      // docs are added only when a proposal is already finalized
      assert(await a.failure(contracts.dao.addProposalDoc.call(
        proposals[0].id,
        randomBytes32(),
        { from: proposals[0].proposer },
      )));
    });
    it('[if not proposer]: revert', async function () {
      // finalize the proposal
      await contracts.dao.finalizeProposal(
        proposals[0].id,
        { from: proposals[0].proposer },
      );

      // if the proposer does not call the function
      // the call should revert
      assert(await a.failure(contracts.dao.addProposalDoc.call(
        proposals[0].id,
        randomBytes32(),
        { from: proposals[1].proposer },
      )));
    });
    it('[if kyc has expired of the proposer]: revert', async function () {
      // expire the KYC of this proposer
      await contracts.daoIdentity.updateKyc(
        proposals[0].proposer,
        'expiring',
        bN(getCurrentTimestamp()).minus(bN(1)),
        { from: addressOf.kycadmin },
      );
      // any function call should revert due to the expired KYC
      assert(await a.failure(contracts.dao.addProposalDoc.call(
        proposals[0].id,
        randomBytes32(),
        { from: proposals[0].proposer },
      )));
      // update the KYC back to be valid
      await contracts.daoIdentity.updateKyc(
        proposals[0].proposer,
        'expiring',
        bN(getCurrentTimestamp()).plus(bN(360000)),
        { from: addressOf.kycadmin },
      );
    });
    it('[for finalized proposal, add docs]: verify newly added docs', async function () {
      // some docs
      const moreDocs = randomBytes32s(3);
      // verify that the addProposalDoc function call is success
      assert.ok(await contracts.dao.addProposalDoc.call(
        proposals[0].id,
        moreDocs[0],
        { from: proposals[0].proposer },
      ));
      // add some docs
      await contracts.dao.addProposalDoc(
        proposals[0].id,
        moreDocs[0],
        { from: proposals[0].proposer },
      );
      await contracts.dao.addProposalDoc(
        proposals[0].id,
        moreDocs[1],
        { from: proposals[0].proposer },
      );

      // read and verify that the docs were appended correctly to the list
      const readMoreDocs = await contracts.daoStorage.readProposalDocs.call(proposals[0].id);
      assert.deepEqual(readMoreDocs[0], moreDocs[0]);
      assert.deepEqual(readMoreDocs[1], moreDocs[1]);
    });
  });

  describe('finishMilestone', function () {
    beforeEach(async function () {
      await resetBeforeEach();
      // add proposal in endorsed state
      // this proposal hasn't been voted on yet
      await addProposal(contracts, proposals[0]);
      await endorseProposal(contracts, proposals[0]);

      // add proposal in the first milestone
      await contracts.daoStorage.mock_put_proposal_in_milestone(
        proposals[1].id,
        bN(0),
        proposals[1].proposer,
        proposals[1].endorser,
        proposals[1].versions[0].milestoneFundings,
        proposals[1].versions[0].finalReward,
        bN(getCurrentTimestamp()).minus(bN(40)),
      );

      // add proposal in the second milestone
      await contracts.daoStorage.mock_put_proposal_in_milestone(
        proposals[2].id,
        bN(1),
        proposals[2].proposer,
        proposals[2].endorser,
        proposals[2].versions[0].milestoneFundings,
        proposals[2].versions[0].finalReward,
        bN(getCurrentTimestamp()).minus(bN(40)),
      );
    });
    it('[in the first milestone, not called by proposer]: revert', async function () {
      // only the proposer of the proposal can finish the milestone
      assert(await a.failure(contracts.dao.finishMilestone.call(
        proposals[1].id,
        bN(0),
        { from: proposals[0].proposer },
      )));
    });
    it('[in the first milestone, proposer\'s KYC has expired]: revert', async function () {
      // expire the KYC of the proposer
      await contracts.daoIdentity.updateKyc(
        proposals[1].proposer,
        'expiry',
        bN(getCurrentTimestamp()).minus(bN(20)),
        { from: addressOf.kycadmin },
      );
      // any operation by this account must be reverted until the KYC is renewed
      assert(await a.failure(contracts.dao.finishMilestone.call(
        proposals[1].id,
        bN(0),
        { from: proposals[1].proposer },
      )));
    });
    it('[in the first milestone, trying to finish second milestone]: revert', async function () {
      // only the current milestone can be finished
      // if the proposer tries to call the finishMilestone function on upcoming milestones
      // the function call must be reverted
      assert(await a.failure(contracts.dao.finishMilestone.call(
        proposals[1].id,
        bN(1),
        { from: proposals[1].proposer },
      )));
    });
    it('[in the second milestone, trying to finish first milestone]: revert', async function () {
      // trying to finish the past milestones should also be reverted
      assert(await a.failure(contracts.dao.finishMilestone.call(
        proposals[2].id,
        bN(0),
        { from: proposals[2].proposer },
      )));
    });
    it('[not yet started first milestone, trying to finish any milestone]: revert', async function () {
      // the first milestone starts only when the draft voting and voting round pass
      // before that, proposals[0] is still not begun the milestone 1
      // finishing the first milestone should revert
      assert(await a.failure(contracts.dao.finishMilestone.call(
        proposals[0].id,
        bN(0),
        { from: proposals[0].proposer },
      )));
    });
    it('[finish first milestone]: verify read functions', async function () {
      // verify that the finish milestone for proposal in milestone 1 is success
      assert.ok(await contracts.dao.finishMilestone.call(
        proposals[1].id,
        bN(0),
        { from: proposals[1].proposer },
      ));
      // finish the milestone
      await contracts.dao.finishMilestone(
        proposals[1].id,
        bN(0),
        { from: proposals[1].proposer },
      );

      // verify voting time and status
      // there is enough time left in this current quarter for a whole voting phase to be completed
      // so the voting time for the next milestone (milestone 2) set should be NOW
      // Note: index of milestones starts from 0
      const votingTime = await contracts.daoStorage.readProposalVotingTime.call(proposals[1].id, bN(1));
      // to check that the voting time is within 5 seconds from getCurrentTimestamp
      assert.deepEqual(timeIsRecent(votingTime, 5), true);
    });
    it('[finish first milestone when time left in quarter is not enough to conduct voting round]: verify next voting time', async function () {
      // wait for some time, so that there is less than CONFIG_VOTE_CLAIMING_DEADLINE (= 5s) left in the quarter
      const currentTimeInQuarter = await contracts.dao.currentTimeInQuarter.call();
      console.log('\t\tcurrentTimeInQuarter = ', currentTimeInQuarter);
      await waitFor(60 - currentTimeInQuarter.toNumber() - 4, addressOf, web3);

      await printDaoDetails(bN, contracts);
      // finish the milestone
      await contracts.dao.finishMilestone(
        proposals[1].id,
        bN(0),
        { from: proposals[1].proposer },
      );

      // verify delayed voting time
      // since we waited for 45 seconds in the 50 second main phase
      // there is not enough time left for the 20 seconds voting round to get completed
      // hence the voting time for the next milestone should be pushed forward to start of the next main phase
      const votingTime = await contracts.daoStorage.readProposalVotingTime.call(proposals[1].id, bN(1));
      const startOfFirstQuarter = await contracts.daoUpgradeStorage.startOfFirstQuarter.call();
      assert.deepEqual(votingTime, startOfFirstQuarter.plus(bN(60)).plus(bN(10)).plus(bN(1)));
    });
  });

  describe('closeProposal', function () {
    beforeEach(async function () {
      await resetBeforeEach();
      await addProposal(contracts, proposals[0]);
      await endorseProposal(contracts, proposals[0]);
    });
    it('[if not proposer]: revert', async function () {
      // only the proposer account can close the proposal (other than founder, but there are other conditions for founders)
      // if somebody else tries to close the proposal, the function call should revert
      assert(await a.failure(contracts.dao.closeProposal.call(proposals[0].id, { from: proposals[1].proposer })));
    });
    it('[if proposer\'s KYC is expired]: revert', async function () {
      // update the KYC of the proposer to be invalid
      await contracts.daoIdentity.updateKyc(
        proposals[0].proposer,
        'expiry',
        bN(getCurrentTimestamp()).minus(bN(20)),
        { from: addressOf.kycadmin },
      );
      // if the proposer's KYC validity has expired
      // any operation done by that proposer should be reverted until they
      // re-KYC
      assert(await a.failure(contracts.dao.closeProposal.call(proposals[0].id, { from: proposals[1].proposer })));
    });
    it('[if proposal has been finalized]: revert', async function () {
      // finalize the proposal
      await contracts.dao.finalizeProposal(proposals[0].id, { from: proposals[0].proposer });
      // a finalized proposal cannot be closed, even by the proposer account
      // proposals can be close only before being finalized
      assert(await a.failure(contracts.dao.closeProposal.call(proposals[0].id, { from: proposals[1].proposer })));
    });
    it('[close a proposal]: verify read functions', async function () {
      // check that the close proposal function runs without reverting
      assert.ok(await contracts.dao.closeProposal.call(
        proposals[0].id,
        { from: proposals[0].proposer },
      ));
      // note the eth balance of the proposer before
      // because at the time of proposal creation, the proposer needs to pay a collateral
      const ethBalanceBefore = await web3.eth.getBalance(proposals[0].proposer);
      const price = web3.toWei(20, 'gwei');
      // close the proposal and compute the gas spent in this txn
      const tx = await contracts.dao.closeProposal(proposals[0].id, { from: proposals[0].proposer, gasPrice: price });
      const gasUsed = tx.receipt.gasUsed * price;

      // verify event logs
      assert.deepEqual(tx.logs[0].event, 'CloseProposal');
      assert.deepEqual(tx.logs[0].args._proposalId, proposals[0].id);

      // verify that the proposal state is now closed, and it is added to the list of closed proposals
      const readProposal = await contracts.daoStorage.readProposal.call(proposals[0].id);
      assert.deepEqual(readProposal[3], paddedHex(web3, proposalStates(bN).PROPOSAL_STATE_CLOSED));
      assert.deepEqual(await contracts.daoStorage.getLastProposalInState.call(proposalStates(bN).PROPOSAL_STATE_CLOSED), paddedHex(web3, proposals[0].id));
      // verify that the proposer has received their collateral of 2 ETH back (minus the gas spent for the above txn)
      assert.deepEqual(await web3.eth.getBalance(proposals[0].proposer), ethBalanceBefore.plus(bN(2 * (10 ** 18))).minus(gasUsed));
    });
    it('[if proposal is already closed]: revert', async function () {
      // close the proposal
      await contracts.dao.closeProposal(proposals[0].id, { from: proposals[0].proposer });
      // a closed proposal cannot be closed again
      // this operation will revert
      assert(await a.failure(contracts.dao.closeProposal.call(proposals[0].id, { from: proposals[1].proposer })));
    });
  });

  describe('founderCloseProposals', function () {
    before(async function () {
      await resetBeforeEach();
      // proposal can be closed after 15 seconds. this is the proposal_dead_duration
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_PROPOSAL_DEAD_DURATION, bN(15));

      // add some dummy proposals and get them endorsed
      await addProposal(contracts, proposals[0]);
      await addProposal(contracts, proposals[1]);
      await addProposal(contracts, proposals[2]);
      await addProposal(contracts, proposals[3]);
      await endorseProposal(contracts, proposals[0]);
      await endorseProposal(contracts, proposals[1]);
      await endorseProposal(contracts, proposals[2]);
      await endorseProposal(contracts, proposals[3]);

      // finalize proposals[2]. At this point in time, proposals[0] and [1] are not finalised
      await contracts.dao.finalizeProposal(proposals[2].id, { from: proposals[2].proposer });

      // proposer has already closed proposals[3]
      await contracts.dao.closeProposal(proposals[3].id, { from: proposals[3].proposer });
    });
    it('[proposal list contains a proposal that has not crossed the deadline]: revert', async function () {
      // both proposal[0] and proposal[1] have not been finalised
      // but the 15 seconds of proposal_dead_duration has not been crossed
      // so if the founder tries to close either/both of these proposals
      // the function call must revert
      assert(await a.failure(contracts.dao.founderCloseProposals.call(
        [proposals[0].id, proposals[1].id],
        { from: addressOf.founderBadgeHolder },
      )));
    });
    it('[called by non-founder]: revert', async function () {
      // wait for 15 seconds
      await waitFor(15, addressOf, web3);

      // now that we have waited for 15 seconds
      // but the call is not made from a founder account
      // so the function call must revert
      assert(await a.failure(contracts.dao.founderCloseProposals.call(
        [proposals[0].id, proposals[1].id],
        { from: addressOf.root },
      )));
    });
    it('[proposal list contains an already finalized proposal]: revert', async function () {
      // if the list of proposal IDs contains even one finalized proposal
      // the function call must be reverted
      // because finalized proposals cannot be closed by founders
      assert(await a.failure(contracts.dao.founderCloseProposals.call(
        [proposals[0].id, proposals[1].id, proposals[2].id],
        { from: addressOf.founderBadgeHolder },
      )));
    });
    it('[proposal list contains an already closed proposal]: revert', async function () {
      // if the list of proposal IDs contains an already closed proposal
      // the function call must be reverted
      assert(await a.failure(contracts.dao.founderCloseProposals.call(
        [proposals[0].id, proposals[1].id, proposals[3].id],
        { from: addressOf.founderBadgeHolder },
      )));
    });
    it('[valid inputs]: close all proposals', async function () {
      // if everything is fine, the non-finalised proposals can be closed
      assert.ok(await contracts.dao.founderCloseProposals.call(
        [proposals[0].id, proposals[1].id],
        { from: addressOf.founderBadgeHolder },
      ));
      const tx = await contracts.dao.founderCloseProposals(
        [proposals[0].id, proposals[1].id],
        { from: addressOf.founderBadgeHolder },
      );

      // verify event logs
      tx.logs.forEach((log, i) => {
        assert.deepEqual(log.event, 'CloseProposal');
        assert.deepEqual(log.args._proposalId, proposals[i].id);
      });

      // verify that the state of these proposals is closed
      const readProposal0 = await contracts.daoStorage.readProposal(proposals[0].id);
      const readProposal1 = await contracts.daoStorage.readProposal(proposals[1].id);
      assert.deepEqual(readProposal0[3], paddedHex(web3, proposalStates(bN).PROPOSAL_STATE_CLOSED));
      assert.deepEqual(readProposal1[3], paddedHex(web3, proposalStates(bN).PROPOSAL_STATE_CLOSED));
    });
  });
});
