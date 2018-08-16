// const a = require('awaiting');

const MockDgd = artifacts.require('./MockDgd.sol');
const MockBadge = artifacts.require('./MockBadge.sol');

const {
  calculateMinQuorum,
  calculateQuota,
} = require('../daoCalculationHelper');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  // registerInteractive,
  deployServices,
  deployInteractive,
} = require('../setup');

const {
  daoConstantsKeys,
  daoConstantsValues,
  phases,
  getPhase,
  getTimeToNextPhase,
} = require('../daoHelpers');

const {
  getCurrentTimestamp,
  randomBytes32s,
  randomAddresses,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

const proposalIds = randomBytes32s(4);
const proposers = randomAddresses(4);
const moreVersions = {
  firstProposal: randomBytes32s(2),
  secondProposal: randomBytes32s(3),
  thirdProposal: randomBytes32s(1),
  fourthProposal: [proposalIds[3]],
};
const milestoneFundings = {
  firstProposal: {
    versionOne: [bN(10 * (10 ** 18)), bN(15 * (10 ** 18)), bN(20 * (10 ** 18))],
    versionTwo: [bN(10 * (10 ** 18)), bN(20 * (10 ** 18)), bN(25 * (10 ** 18))],
    versionThree: [bN(10 * (10 ** 18)), bN(15 * (10 ** 18)), bN(15 * (10 ** 18)), bN(20 * (10 ** 18))],
  },
  secondProposal: {
    versionOne: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
    versionTwo: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
    versionThree: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
    versionFour: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
  },
  thirdProposal: {
    versionOne: [bN(20 * (10 ** 18)), bN(30 * (10 ** 18))],
    versionTwo: [bN(25 * (10 ** 18)), bN(25 * (10 ** 18))],
  },
  fourthProposal: {
    versionOne: [bN(1 * (10 ** 18)), bN(1 * (10 ** 18)), bN(2 * (10 ** 18)), bN(2 * (10 ** 18))],
  },
};
const milestoneDurations = {
  firstProposal: {
    versionOne: [bN(1000), bN(1500), bN(2000)],
    versionTwo: [bN(1000), bN(2000), bN(2500)],
    versionThree: [bN(1000), bN(1500), bN(1500), bN(2000)],
  },
  secondProposal: {
    versionOne: [bN(500), bN(700), bN(300)],
    versionTwo: [bN(500), bN(700), bN(300)],
    versionThree: [bN(500), bN(700), bN(300)],
    versionFour: [bN(500), bN(700), bN(300)],
  },
  thirdProposal: {
    versionOne: [bN(2000), bN(3000)],
    versionTwo: [bN(2500), bN(2500)],
  },
  fourthProposal: {
    versionOne: [bN(100), bN(100), bN(200), bN(200)],
  },
};

contract('DaoCalculatorService', function (accounts) {
  let libs;
  let resolver;
  let contracts;
  let addressOf;

  before(async function () {
    libs = await deployLibraries();
    resolver = await deployNewContractResolver();
    addressOf = await getAccountsAndAddressOf(accounts);
    contracts = {};
    await deployStorage(libs, contracts, resolver, addressOf);
    await deployServices(libs, contracts, resolver, addressOf);
    contracts.dgdToken = await MockDgd.at(process.env.DGD_ADDRESS);
    contracts.badgeToken = await MockBadge.at(process.env.DGD_BADGE_ADDRESS);
    await deployInteractive(libs, contracts, resolver, addressOf);
    await resolver.register_contract('dao', accounts[0]);
    await resolver.register_contract('c:config:controller', accounts[0]);
    await contracts.daoStorage.setStartOfFirstQuarter(getCurrentTimestamp());

    await createDummyDaoData();
    await dummyStake();
    await fundDao();

    await setDummyConfig();
  });

  after(async function () {
    await phaseCorrection(phases.LOCKING_PHASE);
    await withdrawDummyStake();
  });

  const setDummyConfig = async function () {
    // set locking phase to be 10 seconds
    // set quarter phase to be 20 seconds
    // for testing purpose
    await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION, bN(10));
    await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_QUARTER_DURATION, bN(20));
  };

  const waitFor = async function (timeToWait) {
    const timeThen = getCurrentTimestamp();
    async function wait() {
      await web3.eth.sendTransaction({ from: accounts[0], to: accounts[19], value: web3.toWei(0.0001, 'ether') });
      if ((getCurrentTimestamp() - timeThen) > timeToWait) return;
      await wait();
    }
    console.log('       waiting for next phase...');
    await wait();
  };

  /**
   * Wait for time to pass, end in the phaseToEndIn phase
   * @param phaseToEndIn : The phase in which to land (phases.LOCKING_PHASE or phases.MAIN_PHASE)
   */
  const phaseCorrection = async function (phaseToEndIn) {
    const startOfDao = await contracts.daoStorage.startOfFirstQuarter.call();
    const lockingPhaseDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION);
    const quarterDuration = await contracts.daoConfigsStorage.uintConfigs.call(daoConstantsKeys().CONFIG_QUARTER_DURATION);
    const currentPhase = getPhase(
      getCurrentTimestamp(),
      startOfDao.toNumber(),
      lockingPhaseDuration.toNumber(),
      quarterDuration.toNumber(),
    );
    if (currentPhase !== phaseToEndIn) {
      const timeToNextPhase = getTimeToNextPhase(getCurrentTimestamp(), startOfDao.toNumber(), lockingPhaseDuration.toNumber(), quarterDuration.toNumber());
      await waitFor(timeToNextPhase);
    }
  };

  const fundDao = async function () {
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: contracts.daoFundingManager.address,
      value: web3.toWei(1000, 'ether'),
    });
    assert.deepEqual(await contracts.daoFundingStorage.ethInDao.call(), bN(web3.toWei(1000, 'ether')));
  };

  const dummyStake = async function () {
    await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(5), { from: addressOf.badgeHolder1 });
    await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(8), { from: addressOf.badgeHolder2 });
    await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(11), { from: addressOf.badgeHolder3 });
    await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(6), { from: addressOf.badgeHolder4 });
    await contracts.daoStakeLocking.lockBadge(bN(5), { from: addressOf.badgeHolder1 });
    await contracts.daoStakeLocking.lockBadge(bN(8), { from: addressOf.badgeHolder2 });
    await contracts.daoStakeLocking.lockBadge(bN(11), { from: addressOf.badgeHolder3 });
    await contracts.daoStakeLocking.lockBadge(bN(6), { from: addressOf.badgeHolder4 });

    await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(50), { from: addressOf.badgeHolder1 });
    await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(62), { from: addressOf.badgeHolder2 });
    await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(75), { from: addressOf.badgeHolder3 });
    await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(40), { from: addressOf.badgeHolder4 });
    await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(15), { from: addressOf.dgdHolder1 });
    await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(17), { from: addressOf.dgdHolder2 });
    await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(20), { from: addressOf.dgdHolder3 });
    await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(25), { from: addressOf.dgdHolder4 });
    await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(30), { from: addressOf.dgdHolder5 });
    await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(40), { from: addressOf.dgdHolder6 });
    await contracts.daoStakeLocking.lockDGD(bN(50), { from: addressOf.badgeHolder1 });
    await contracts.daoStakeLocking.lockDGD(bN(62), { from: addressOf.badgeHolder2 });
    await contracts.daoStakeLocking.lockDGD(bN(75), { from: addressOf.badgeHolder3 });
    await contracts.daoStakeLocking.lockDGD(bN(40), { from: addressOf.badgeHolder4 });
    await contracts.daoStakeLocking.lockDGD(bN(15), { from: addressOf.dgdHolder1 });
    await contracts.daoStakeLocking.lockDGD(bN(17), { from: addressOf.dgdHolder2 });
    await contracts.daoStakeLocking.lockDGD(bN(20), { from: addressOf.dgdHolder3 });
    await contracts.daoStakeLocking.lockDGD(bN(25), { from: addressOf.dgdHolder4 });
    await contracts.daoStakeLocking.lockDGD(bN(30), { from: addressOf.dgdHolder5 });
    await contracts.daoStakeLocking.lockDGD(bN(40), { from: addressOf.dgdHolder6 });
  };

  const withdrawDummyStake = async function () {
    await contracts.daoStakeLocking.withdrawBadge(bN(5), { from: addressOf.badgeHolder1 });
    await phaseCorrection(phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.withdrawBadge(bN(8), { from: addressOf.badgeHolder2 });
    await phaseCorrection(phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.withdrawBadge(bN(13), { from: addressOf.badgeHolder3 });
    await phaseCorrection(phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.withdrawBadge(bN(8), { from: addressOf.badgeHolder4 });
    await phaseCorrection(phases.LOCKING_PHASE);

    await contracts.daoStakeLocking.withdrawDGD(bN(50), { from: addressOf.badgeHolder1 });
    await phaseCorrection(phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.withdrawDGD(bN(62), { from: addressOf.badgeHolder2 });
    await phaseCorrection(phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.withdrawDGD(bN(75), { from: addressOf.badgeHolder3 });
    await phaseCorrection(phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.withdrawDGD(bN(40), { from: addressOf.badgeHolder4 });
    await phaseCorrection(phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.withdrawDGD(bN(15), { from: addressOf.dgdHolder1 });
    await phaseCorrection(phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.withdrawDGD(bN(27), { from: addressOf.dgdHolder2 });
    await phaseCorrection(phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.withdrawDGD(bN(28), { from: addressOf.dgdHolder3 });
    await phaseCorrection(phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.withdrawDGD(bN(25), { from: addressOf.dgdHolder4 });
    await phaseCorrection(phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.withdrawDGD(bN(30), { from: addressOf.dgdHolder5 });
    await phaseCorrection(phases.LOCKING_PHASE);
    await contracts.daoStakeLocking.withdrawDGD(bN(40), { from: addressOf.dgdHolder6 });
  };

  const createDummyDaoData = async function () {
    // create and edit proposals (only 1 edit for proposal 1)
    await contracts.daoStorage.addProposal(
      proposalIds[0],
      proposers[0], milestoneDurations.firstProposal.versionOne,
      milestoneFundings.firstProposal.versionOne,
    );
    await contracts.daoStorage.editProposal(
      proposalIds[0],
      moreVersions.firstProposal[0], milestoneDurations.firstProposal.versionTwo,
      milestoneFundings.firstProposal.versionTwo,
    );
    await contracts.daoStorage.addProposal(
      proposalIds[1],
      proposers[1], milestoneDurations.secondProposal.versionOne,
      milestoneFundings.secondProposal.versionOne,
    );
    await contracts.daoStorage.editProposal(
      proposalIds[1],
      moreVersions.secondProposal[0], milestoneDurations.secondProposal.versionTwo,
      milestoneFundings.secondProposal.versionTwo,
    );
    await contracts.daoStorage.editProposal(
      proposalIds[1],
      moreVersions.secondProposal[1], milestoneDurations.secondProposal.versionThree,
      milestoneFundings.secondProposal.versionThree,
    );
    await contracts.daoStorage.editProposal(
      proposalIds[1],
      moreVersions.secondProposal[2], milestoneDurations.secondProposal.versionFour,
      milestoneFundings.secondProposal.versionFour,
    );
    await contracts.daoStorage.addProposal(
      proposalIds[2],
      proposers[2], milestoneDurations.thirdProposal.versionOne,
      milestoneFundings.thirdProposal.versionOne,
    );
    await contracts.daoStorage.editProposal(
      proposalIds[2],
      moreVersions.thirdProposal[0], milestoneDurations.thirdProposal.versionTwo,
      milestoneFundings.thirdProposal.versionTwo,
    );
    await contracts.daoStorage.addProposal(
      proposalIds[3],
      proposers[3], milestoneDurations.fourthProposal.versionOne,
      milestoneFundings.fourthProposal.versionOne,
    );
    // endorse proposals
    await contracts.daoStorage.updateProposalEndorse(proposalIds[0], addressOf.badgeHolder1);
    await contracts.daoStorage.updateProposalEndorse(proposalIds[1], addressOf.badgeHolder2);
    await contracts.daoStorage.updateProposalEndorse(proposalIds[2], addressOf.badgeHolder3);
    await contracts.daoStorage.updateProposalEndorse(proposalIds[3], addressOf.badgeHolder4);
  };

  describe('minimumDraftQuorum', function () {
    it('[draft quorum]', async function () {
      // proposal 1
      const quorumFromService = await contracts.daoCalculatorService.minimumDraftQuorum.call(proposalIds[0]);
      await contracts.daoCalculatorService.minimumDraftQuorum(proposalIds[0]);
      const quorumFromHelper = calculateMinQuorum(
        30,
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR).toNumber(),
        55 * (10 ** 18),
        1000 * (10 ** 18),
      );
      assert.deepEqual(quorumFromService.toNumber(), quorumFromHelper);

      // add another version of proposal 1
      await contracts.daoStorage.editProposal(
        proposalIds[0],
        moreVersions.firstProposal[1], milestoneDurations.firstProposal.versionThree,
        milestoneFundings.firstProposal.versionThree,
      );
      // stake more badges
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(2), { from: addressOf.badgeHolder4 });
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, bN(2), { from: addressOf.badgeHolder3 });
      assert.deepEqual(await contracts.daoStakeLocking.isLockingPhase.call(), true);
      // console.log(addressOf.badgeHolder1);
      // console.log(addressOf.badgeHolder2);
      await contracts.daoStakeLocking.lockBadge(bN(2), { from: addressOf.badgeHolder4 });
      await contracts.daoStakeLocking.lockBadge(bN(2), { from: addressOf.badgeHolder3 });

      const quorumFromService2 = await contracts.daoCalculatorService.minimumDraftQuorum.call(proposalIds[0]);
      await contracts.daoCalculatorService.minimumDraftQuorum(proposalIds[0]);
      const quorumFromHelper2 = calculateMinQuorum(
        34,
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR).toNumber(),
        60 * (10 ** 18),
        1000 * (10 ** 18),
      );
      assert.deepEqual(quorumFromService2.toNumber(), quorumFromHelper2);
    });
  });

  describe('minimumVotingQuorum', function () {
    it('milestone 1', async function () {
      // check for milestone 1
      const quorumFromService = await contracts.daoCalculatorService.minimumVotingQuorum.call(proposalIds[0], bN(0));
      await contracts.daoCalculatorService.minimumVotingQuorum(proposalIds[0], bN(0));
      const quorumFromHelper = calculateMinQuorum(
        374,
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR).toNumber(),
        10 * (10 ** 18),
        1000 * (10 ** 18),
      );
      assert.deepEqual(quorumFromService.toNumber(), quorumFromHelper);
    });
    it('milestone 2', async function () {
      // check for milestone 2
      const quorumFromService2 = await contracts.daoCalculatorService.minimumVotingQuorum.call(proposalIds[0], bN(1));
      await contracts.daoCalculatorService.minimumVotingQuorum(proposalIds[0], bN(1));
      const quorumFromHelper2 = calculateMinQuorum(
        374,
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR).toNumber(),
        15 * (10 ** 18),
        1000 * (10 ** 18),
      );
      assert.deepEqual(quorumFromService2.toNumber(), quorumFromHelper2);
    });
    it('milestone 3', async function () {
      // check for milestone 3
      const quorumFromService3 = await contracts.daoCalculatorService.minimumVotingQuorum.call(proposalIds[0], bN(2));
      await contracts.daoCalculatorService.minimumVotingQuorum(proposalIds[0], bN(2));
      const quorumFromHelper3 = calculateMinQuorum(
        374,
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR).toNumber(),
        15 * (10 ** 18),
        1000 * (10 ** 18),
      );
      assert.deepEqual(quorumFromService3.toNumber(), quorumFromHelper3);
    });
    it('milestone 4', async function () {
      // stake more DGDs
      await phaseCorrection(phases.LOCKING_PHASE);
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(10), { from: addressOf.dgdHolder2 });
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, bN(8), { from: addressOf.dgdHolder3 });
      await contracts.daoStakeLocking.lockDGD(bN(10), { from: addressOf.dgdHolder2 });
      await contracts.daoStakeLocking.lockDGD(bN(8), { from: addressOf.dgdHolder3 });

      // check for milestone 4
      const quorumFromService4 = await contracts.daoCalculatorService.minimumVotingQuorum.call(proposalIds[0], bN(3));
      await contracts.daoCalculatorService.minimumVotingQuorum(proposalIds[0], bN(3));
      const quorumFromHelper4 = calculateMinQuorum(
        392,
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR).toNumber(),
        (daoConstantsValues(bN).CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR).toNumber(),
        20 * (10 ** 18),
        1000 * (10 ** 18),
      );
      assert.deepEqual(quorumFromService4.toNumber(), quorumFromHelper4);
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
      await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_DRAFT_QUOTA_NUMERATOR, bN(29));
      const quotaFromService = await contracts.daoCalculatorService.draftQuotaPass.call(bN(15), bN(35));
      assert.deepEqual(quotaFromService, true);
    });
    after(async function () {
      await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_DRAFT_QUOTA_NUMERATOR, bN(30));
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
      await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_VOTING_QUOTA_NUMERATOR, bN(29));
      const quotaFromService = await contracts.daoCalculatorService.votingQuotaPass.call(bN(15), bN(35));
      assert.deepEqual(quotaFromService, true);
    });
    before(async function () {
      await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_VOTING_QUOTA_NUMERATOR, bN(30));
    });
  });
});
