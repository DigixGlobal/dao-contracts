const a = require('awaiting');

const {
  calculateMinQuorum,
  calculateQuota,
  scaledDgd,
  calculateUserEffectiveBalance,
} = require('../daoCalculationHelper');

const {
  getAccountsAndAddressOf,
  deployFreshDao,
  getTestProposals,
  addProposal,
  endorseProposal,
  getParticipants,
  setupParticipantsStates,
  updateKyc,
  waitFor,
} = require('../setup');

const {
  daoConstantsKeys,
  daoConstantsValues,
} = require('../daoHelpers');

const {
  randomBytes32,
  getCurrentTimestamp,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('DaoCalculatorService', function (accounts) {
  const libs = {};
  const contracts = {};
  const addressOf = {};
  let proposals;

  const addAndEndorseProposals = async function (contracts, proposals) {
    await a.map(proposals, 20, async (proposal) => {
      await addProposal(contracts, proposal);
      await endorseProposal(contracts, proposal);
      await contracts.dao.finalizeProposal(proposal.id, { from: proposal.proposer });
    });
  };

  before(async function () {
    getAccountsAndAddressOf(accounts, addressOf);
    await deployFreshDao(libs, contracts, addressOf, accounts, bN, web3);
    await setupParticipantsStates(web3, contracts, addressOf, bN);
    await contracts.daoIdentity.addGroupUser(bN(3), addressOf.prl, randomBytes32());
    await contracts.daoIdentity.addGroupUser(bN(4), addressOf.kycadmin, randomBytes32());
    await updateKyc(contracts, addressOf, getParticipants(addressOf, bN));
    proposals = getTestProposals(bN, addressOf);
    await addAndEndorseProposals(contracts, proposals);
  });

  describe('minimumDraftQuorum', function () {
    it('[proposal 1]', async function () {
      const weiInDao = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const quorumFromService = await contracts.daoCalculatorService.minimumDraftQuorum.call(proposals[0].id);
      const quorumFromHelper = calculateMinQuorum(
        230 * (10 ** 9),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR).toNumber(),
        2 * (10 ** 18),
        weiInDao.toNumber(),
      );
      assert.deepEqual(quorumFromService.toNumber(), quorumFromHelper);
    });
    it('[proposal 2]', async function () {
      const weiInDao = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const quorumFromService = await contracts.daoCalculatorService.minimumDraftQuorum.call(proposals[1].id);
      const quorumFromHelper = calculateMinQuorum(
        230 * (10 ** 9),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR).toNumber(),
        5 * (10 ** 18),
        weiInDao.toNumber(),
      );
      assert.deepEqual(quorumFromService.toNumber(), quorumFromHelper);
    });
  });

  describe('minimumVotingQuorum', function () {
    it('[proposal 1, milestone 1]', async function () {
      const quorumFromService = await contracts.daoCalculatorService.minimumVotingQuorum.call(proposals[0].id, bN(0));
      await contracts.daoCalculatorService.minimumVotingQuorum(proposals[0].id, bN(0));
      const weiInDao = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const quorumFromHelper = calculateMinQuorum(
        380 * (10 ** 9),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR).toNumber(),
        2 * (10 ** 18),
        weiInDao.toNumber(),
      );
      assert.deepEqual(quorumFromService.toNumber(), quorumFromHelper);
    });
    it('[proposal 1, milestone 2]', async function () {
      const quorumFromService2 = await contracts.daoCalculatorService.minimumVotingQuorum.call(proposals[0].id, bN(1));
      await contracts.daoCalculatorService.minimumVotingQuorum(proposals[0].id, bN(1));
      const weiInDao = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const quorumFromHelper2 = calculateMinQuorum(
        380 * (10 ** 9),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR).toNumber(),
        3 * (10 ** 18),
        weiInDao.toNumber(),
      );
      assert.deepEqual(quorumFromService2.toNumber(), quorumFromHelper2);
    });
    it('[proposal 2, milestone 1]', async function () {
      const quorumFromService = await contracts.daoCalculatorService.minimumVotingQuorum.call(proposals[1].id, bN(0));
      await contracts.daoCalculatorService.minimumVotingQuorum(proposals[1].id, bN(0));
      const weiInDao = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const quorumFromHelper = calculateMinQuorum(
        380 * (10 ** 9),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR).toNumber(),
        5 * (10 ** 18),
        weiInDao.toNumber(),
      );
      assert.deepEqual(quorumFromService.toNumber(), quorumFromHelper);
    });
    it('[proposal 2, milestone 2]', async function () {
      const quorumFromService2 = await contracts.daoCalculatorService.minimumVotingQuorum.call(proposals[1].id, bN(1));
      await contracts.daoCalculatorService.minimumVotingQuorum(proposals[1].id, bN(1));
      const weiInDao = await web3.eth.getBalance(contracts.daoFundingManager.address);
      const quorumFromHelper2 = calculateMinQuorum(
        380 * (10 ** 9),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR).toNumber(),
        7 * (10 ** 18),
        weiInDao.toNumber(),
      );
      assert.deepEqual(quorumFromService2.toNumber(), quorumFromHelper2);
    });
  });

  describe('draftQuotaPass', function () {
    it('[> 30 percent]: pass', async function () {
      // 33% should pass
      const quotaFromService = await contracts.daoCalculatorService.draftQuotaPass.call(bN(20), bN(10));
      const quotaFromHelper = calculateQuota(20, 10, daoConstantsValues(bN).CONFIG_DRAFT_QUOTA_NUMERATOR, daoConstantsValues(bN).CONFIG_DRAFT_QUOTA_DENOMINATOR);
      assert.deepEqual(quotaFromService, quotaFromHelper);
    });
    it('[> 50 percent]: pass', async function () {
      // should pass
      const quotaFromService = await contracts.daoCalculatorService.draftQuotaPass.call(bN(25), bN(10));
      const quotaFromHelper = calculateQuota(25, 10, daoConstantsValues(bN).CONFIG_DRAFT_QUOTA_NUMERATOR, daoConstantsValues(bN).CONFIG_DRAFT_QUOTA_DENOMINATOR);
      assert.deepEqual(quotaFromService, quotaFromHelper);
    });
    it('[= 30 percent]: fail', async function () {
      // exact 30% should fail
      const quotaFromService = await contracts.daoCalculatorService.draftQuotaPass.call(bN(15), bN(35));
      const quotaFromHelper = calculateQuota(15, 35, daoConstantsValues(bN).CONFIG_DRAFT_QUOTA_NUMERATOR, daoConstantsValues(bN).CONFIG_DRAFT_QUOTA_DENOMINATOR);
      assert.deepEqual(quotaFromService, quotaFromHelper);
      assert.deepEqual(quotaFromService, false);
    });
    it('[set req quota to 29/100]: 30% is now pass', async function () {
      // modify 30% to 29% and the above should pass
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_DRAFT_QUOTA_NUMERATOR, bN(29));
      const quotaFromService = await contracts.daoCalculatorService.draftQuotaPass.call(bN(15), bN(35));
      assert.deepEqual(quotaFromService, true);
    });
    after(async function () {
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_DRAFT_QUOTA_NUMERATOR, bN(30));
    });
  });

  describe('votingQuotaPass', function () {
    it('[> 30 percent]: pass', async function () {
      // 33% should pass
      const quotaFromService = await contracts.daoCalculatorService.votingQuotaPass.call(bN(20), bN(10));
      const quotaFromHelper = calculateQuota(20, 10, daoConstantsValues(bN).CONFIG_VOTING_QUOTA_NUMERATOR, daoConstantsValues(bN).CONFIG_VOTING_QUOTA_DENOMINATOR);
      assert.deepEqual(quotaFromService, quotaFromHelper);
    });
    it('[> 50 percent]: pass', async function () {
      // should pass
      const quotaFromService = await contracts.daoCalculatorService.votingQuotaPass.call(bN(25), bN(10));
      const quotaFromHelper = calculateQuota(25, 10, daoConstantsValues(bN).CONFIG_VOTING_QUOTA_NUMERATOR, daoConstantsValues(bN).CONFIG_VOTING_QUOTA_DENOMINATOR);
      assert.deepEqual(quotaFromService, quotaFromHelper);
    });
    it('[= 30 percent]: fail', async function () {
      // exact 30% should fail
      const quotaFromService = await contracts.daoCalculatorService.votingQuotaPass.call(bN(15), bN(35));
      const quotaFromHelper = calculateQuota(15, 35, daoConstantsValues(bN).CONFIG_VOTING_QUOTA_NUMERATOR, daoConstantsValues(bN).CONFIG_VOTING_QUOTA_DENOMINATOR);
      assert.deepEqual(quotaFromService, quotaFromHelper);
      assert.deepEqual(quotaFromService, false);
    });
    it('[lower the req quota]: pass', async function () {
      // modify 30% to 29% and the above should pass
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTING_QUOTA_NUMERATOR, bN(29));
      const quotaFromService = await contracts.daoCalculatorService.votingQuotaPass.call(bN(15), bN(35));
      assert.deepEqual(quotaFromService, true);
    });
    after(async function () {
      await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTING_QUOTA_NUMERATOR, bN(30));
    });
  });

  describe('calculateAdditionalLockedDGDStake', function () {
    const mockSetStartOfDao = async function (contracts, start) {
      await contracts.daoUpgradeStorage.mock_set_start_of_quarter(start);
    };
    it('[In beginning of locking phase]: additional = amount', async function () {
      // the dao has just begun
      const start = bN(getCurrentTimestamp());
      await mockSetStartOfDao(contracts, start);
      // wait for 1 second
      await waitFor(1, addressOf, web3);
      // check for 100 DGDs
      const amount = bN(100 * (10 ** 9));
      const additional = await contracts.daoCalculatorService.calculateAdditionalLockedDGDStake.call(amount);
      assert.deepEqual(amount, additional);

      // locking phase of quarter 2
      await mockSetStartOfDao(contracts, bN(getCurrentTimestamp()).minus(bN(60)));
      // wait for 1 second
      await waitFor(1, addressOf, web3);
      // check for 110 DGDs
      const amount2 = bN(110 * (10 ** 9));
      const additional2 = await contracts.daoCalculatorService.calculateAdditionalLockedDGDStake.call(amount2);
      assert.deepEqual(amount2, additional2);
    });
    it('[Just before the end of the locking phase]: additional = amount', async function () {
      await mockSetStartOfDao(contracts, bN(getCurrentTimestamp()).minus(bN(9)));
      // check for 100 DGDs
      const amount = bN(100 * (10 ** 9));
      const additional = await contracts.daoCalculatorService.calculateAdditionalLockedDGDStake.call(amount);
      assert.deepEqual(amount, additional);

      // almost end of locking phase of quarter 4
      await mockSetStartOfDao(contracts, bN(getCurrentTimestamp()).minus(bN(189)));
      // check for 100 DGDs
      const amount2 = bN(110 * (10 ** 9));
      const additional2 = await contracts.daoCalculatorService.calculateAdditionalLockedDGDStake.call(amount2);
      assert.deepEqual(amount2, additional2);
    });
    it('[Just after the end of the locking phase, i.e. main phase]: additional != amount, scales by the time remaining', async function () {
      await mockSetStartOfDao(contracts, bN(getCurrentTimestamp()).minus(bN(11)));
      // check for 100 DGDs
      const amount = bN(100 * (10 ** 9));
      const additional = await contracts.daoCalculatorService.calculateAdditionalLockedDGDStake.call(amount);
      assert.isBelow(additional.toNumber(), amount.toNumber());

      // almost end of locking phase of quarter 4
      await mockSetStartOfDao(contracts, bN(getCurrentTimestamp()).minus(bN(191)));
      // check for 100 DGDs
      const amount2 = bN(110 * (10 ** 9));
      const additional2 = await contracts.daoCalculatorService.calculateAdditionalLockedDGDStake.call(amount2);
      assert.isBelow(additional2.toNumber(), amount2.toNumber());
    });
    it('[During the main phase]: scales by the time remaining', async function () {
      const timeNow1 = getCurrentTimestamp();
      const start1 = bN(timeNow1).minus(bN(20));
      await mockSetStartOfDao(contracts, start1);
      const amount1 = bN(100 * (10 ** 9));
      const additional1Contract = await contracts.daoCalculatorService.calculateAdditionalLockedDGDStake.call(amount1);
      const additional1Helper = scaledDgd(timeNow1, start1.toNumber(), 10, 60, 100 * (10 ** 9));
      assert.deepEqual(additional1Contract, bN(additional1Helper));

      const timeNow2 = getCurrentTimestamp();
      const start2 = bN(timeNow2).minus(bN(35));
      await mockSetStartOfDao(contracts, start2);
      const amount2 = bN(100 * (10 ** 9));
      const additional2Contract = await contracts.daoCalculatorService.calculateAdditionalLockedDGDStake.call(amount2);
      const additional2Helper = scaledDgd(timeNow2, start2.toNumber(), 10, 60, 100 * (10 ** 9));
      assert.deepEqual(additional2Contract, bN(additional2Helper));

      // q2
      const timeNow3 = getCurrentTimestamp();
      const start3 = bN(timeNow3).minus(bN(95));
      await mockSetStartOfDao(contracts, start3);
      const amount3 = bN(100 * (10 ** 9));
      const additional3Contract = await contracts.daoCalculatorService.calculateAdditionalLockedDGDStake.call(amount3);
      const additional3Helper = scaledDgd(timeNow3, start3.toNumber(), 10, 60, 100 * (10 ** 9));
      assert.deepEqual(additional3Contract, bN(additional3Helper));

      // q3
      const timeNow4 = getCurrentTimestamp();
      const start4 = bN(timeNow4).minus(bN(170));
      await mockSetStartOfDao(contracts, start4);
      const amount4 = bN(100 * (10 ** 9));
      const additional4Contract = await contracts.daoCalculatorService.calculateAdditionalLockedDGDStake.call(amount4);
      const additional4Helper = scaledDgd(timeNow4, start4.toNumber(), 10, 60, 100 * (10 ** 9));
      assert.deepEqual(additional4Contract, bN(additional4Helper));
    });
    it('[Just before end of the main phase]: additional tends to 0', async function () {
      const timeNow1 = getCurrentTimestamp();
      const start1 = bN(timeNow1).minus(bN(58));
      await mockSetStartOfDao(contracts, start1);
      const amount1 = bN(100 * (10 ** 9));
      const additional1Contract = await contracts.daoCalculatorService.calculateAdditionalLockedDGDStake.call(amount1);
      const additional1Helper = scaledDgd(timeNow1, start1.toNumber(), 10, 60, 100 * (10 ** 9));
      assert.deepEqual(additional1Contract, bN(additional1Helper));

      const timeNow2 = getCurrentTimestamp();
      const start2 = bN(timeNow1).minus(bN(118));
      await mockSetStartOfDao(contracts, start2);
      const amount2 = bN(100 * (10 ** 9));
      const additional2Contract = await contracts.daoCalculatorService.calculateAdditionalLockedDGDStake.call(amount2);
      const additional2Helper = scaledDgd(timeNow2, start2.toNumber(), 10, 60, 100 * (10 ** 9));
      assert.deepEqual(additional2Contract, bN(additional2Helper));
    });
  });

  describe('calculateUserEffectiveBalance', function () {
    it('[quarter point < minimal participation]', async function () {
      const fromHelper = calculateUserEffectiveBalance(
        daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
        bN(1),
        bN(30),
        bN(100 * (10 ** 9)),
      );
      const fromContract = await contracts.daoCalculatorService.calculateUserEffectiveBalance.call(
        daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
        bN(1),
        bN(30),
        bN(100 * (10 ** 9)),
      );

      const fromHelper2 = calculateUserEffectiveBalance(
        daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
        bN(2),
        bN(45),
        bN(73 * (10 ** 9)),
      );
      const fromContract2 = await contracts.daoCalculatorService.calculateUserEffectiveBalance.call(
        daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
        bN(2),
        bN(45),
        bN(73 * (10 ** 9)),
      );

      const fromHelper3 = calculateUserEffectiveBalance(
        daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
        bN(0),
        bN(42),
        bN(64 * (10 ** 9)),
      );
      const fromContract3 = await contracts.daoCalculatorService.calculateUserEffectiveBalance.call(
        daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
        bN(0),
        bN(42),
        bN(64 * (10 ** 9)),
      );

      assert.deepEqual(bN(fromHelper), fromContract);
      assert.deepEqual(bN(fromHelper2), fromContract2);
      assert.deepEqual(bN(fromHelper3), fromContract3);
    });
    it('[quarter point >= minimal participation]', async function () {
      const fromHelper = calculateUserEffectiveBalance(
        daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
        bN(4),
        bN(25),
        bN(110 * (10 ** 9)),
      );
      const fromContract = await contracts.daoCalculatorService.calculateUserEffectiveBalance.call(
        daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
        bN(4),
        bN(25),
        bN(110 * (10 ** 9)),
      );

      const fromHelper2 = calculateUserEffectiveBalance(
        daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
        bN(7),
        bN(65),
        bN(97 * (10 ** 9)),
      );
      const fromContract2 = await contracts.daoCalculatorService.calculateUserEffectiveBalance.call(
        daoConstantsValues(bN).CONFIG_MINIMAL_QUARTER_POINT,
        daoConstantsValues(bN).CONFIG_QUARTER_POINT_SCALING_FACTOR,
        daoConstantsValues(bN).CONFIG_REPUTATION_POINT_SCALING_FACTOR,
        bN(7),
        bN(65),
        bN(97 * (10 ** 9)),
      );

      assert.deepEqual(bN(fromHelper), fromContract);
      assert.deepEqual(bN(fromHelper2), fromContract2);
    });
  });

  describe('Special Proposals', function () {
    it('[minimumVotingQuorumForSpecial]', async function () {
      const totalLockedDGDStake = await contracts.daoStakeStorage.totalLockedDGDStake.call();
      const quorumCalculated = daoConstantsValues(bN).CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR
        .times(totalLockedDGDStake)
        .dividedToIntegerBy(daoConstantsValues(bN).CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR);

      assert.deepEqual(await contracts.daoCalculatorService.minimumVotingQuorumForSpecial.call(), quorumCalculated);
    });
    it('[votingQuotaForSpecialPass]', async function () {
      // 51% should fail
      assert.deepEqual(await contracts.daoCalculatorService.votingQuotaForSpecialPass.call(bN(51), bN(49)), false);

      // 52% should pass
      assert.deepEqual(await contracts.daoCalculatorService.votingQuotaForSpecialPass.call(bN(52), bN(48)), true);

      // > 51% should pass
      assert.deepEqual(await contracts.daoCalculatorService.votingQuotaForSpecialPass.call(bN(53), bN(47)), true);
      assert.deepEqual(await contracts.daoCalculatorService.votingQuotaForSpecialPass.call(bN(63), bN(37)), true);
      assert.deepEqual(await contracts.daoCalculatorService.votingQuotaForSpecialPass.call(bN(90), bN(10)), true);
      assert.deepEqual(await contracts.daoCalculatorService.votingQuotaForSpecialPass.call(bN(99), bN(1)), true);
      assert.deepEqual(await contracts.daoCalculatorService.votingQuotaForSpecialPass.call(bN(100), bN(0)), true);

      // < 51% should fail
      assert.deepEqual(await contracts.daoCalculatorService.votingQuotaForSpecialPass.call(bN(50), bN(50)), false);
      assert.deepEqual(await contracts.daoCalculatorService.votingQuotaForSpecialPass.call(bN(40), bN(60)), false);
      assert.deepEqual(await contracts.daoCalculatorService.votingQuotaForSpecialPass.call(bN(25), bN(75)), false);
      assert.deepEqual(await contracts.daoCalculatorService.votingQuotaForSpecialPass.call(bN(1), bN(99)), false);
      assert.deepEqual(await contracts.daoCalculatorService.votingQuotaForSpecialPass.call(bN(0), bN(100)), false);
    });
  });
});
