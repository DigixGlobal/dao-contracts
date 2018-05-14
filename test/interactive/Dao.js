const a = require('awaiting');

const MockDGD = artifacts.require('./MockDGD.sol');
const MockBadge = artifacts.require('./MockBadge.sol');

const {
  deployLibraries,
  deployNewContractResolver,
  getAccountsAndAddressOf,
  deployStorage,
  deployServices,
  deployInteractive,
} = require('../setup');

const {
  sampleBadgeWeights,
  sampleStakeWeights,
  configs,
  daoConstantsKeys,
  daoConstantsValues,
  phases,
  getPhase,
  getTimeToNextPhase,
  proposalStates,
  EMPTY_BYTES,
  EMPTY_ADDRESS,
} = require('../daoHelpers');

const {
  randomBigNumber,
  getCurrentTimestamp,
  timeIsRecent,
  randomBytes32,
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
  fourthProposal: [proposalIds[3]]
}
const milestoneFundings = {
  firstProposal: {
    versionOne  : [bN(10 * (10 ** 18)), bN(15 * (10 ** 18)), bN(20 * (10 ** 18))],
    versionTwo  : [bN(10 * (10 ** 18)), bN(20 * (10 ** 18)), bN(25 * (10 ** 18))],
    versionThree: [bN(10 * (10 ** 18)), bN(15 * (10 ** 18)), bN(15 * (10 ** 18)), bN(20 * (10 ** 18))]
  },
  secondProposal: {
    versionOne  : [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
    versionTwo  : [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
    versionThree: [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))],
    versionFour : [bN(5 * (10 ** 18)), bN(7 * (10 ** 18)), bN(3 * (10 ** 18))]
  },
  thirdProposal: {
    versionOne  : [bN(20 * (10 ** 18)), bN(30 * (10 ** 18))],
    versionTwo  : [bN(25 * (10 ** 18)), bN(25 * (10 ** 18))]
  },
  fourthProposal: {
    versionOne  : [bN(1 * (10 ** 18)), bN(1 * (10 ** 18)), bN(2 * (10 ** 18)), bN(2 * (10 ** 18))]
  }
}
const milestoneDurations = {
  firstProposal: {
    versionOne  : [bN(1000), bN(1500), bN(2000)],
    versionTwo  : [bN(1000), bN(2000), bN(2500)],
    versionThree: [bN(1000), bN(1500), bN(1500), bN(2000)]
  },
  secondProposal: {
    versionOne  : [bN(500), bN(700), bN(300)],
    versionTwo  : [bN(500), bN(700), bN(300)],
    versionThree: [bN(500), bN(700), bN(300)],
    versionFour : [bN(500), bN(700), bN(300)]
  },
  thirdProposal: {
    versionOne  : [bN(2000), bN(3000)],
    versionTwo  : [bN(2500), bN(2500)]
  },
  fourthProposal: {
    versionOne  : [bN(100), bN(100), bN(200), bN(200)]
  }
}

contract('Dao', function (accounts) {
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
    // await resolver.register_contract('c:dao', addressOf.root);
    // await contracts.daoStorage.setStartOfFirstQuarter(getCurrentTimestamp());
    await deployServices(libs, contracts, resolver, addressOf);
    contracts.dgdToken = await MockDGD.at(process.env.DGD_ADDRESS);
    contracts.badgeToken = await MockBadge.at(process.env.DGD_BADGE_ADDRESS);
    await deployInteractive(libs, contracts, resolver, addressOf);
    await resolver.register_contract('c:config:controller', addressOf.root);
    await setDummyConfig();
  });

  after(async function () {
    await setConfig();
  });

  const setDummyConfig = async function () {
    // set locking phase to be 10 seconds
    // set quarter phase to be 20 seconds
    // for testing purpose
    await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION, bN(10));
    await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_QUARTER_DURATION, bN(20));
  };

  const setConfig = async function () {
    await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_LOCKING_PHASE_DURATION,
                                                          daoConstantsValues(bN).CONFIG_LOCKING_PHASE_DURATION);
    await contracts.daoConfigsStorage.set_uint_config(daoConstantsKeys().CONFIG_QUARTER_DURATION,
                                                          daoConstantsValues(bN).CONFIG_QUARTER_DURATION);
  };

  const waitFor = async function (timeToWait) {
    const timeThen = getCurrentTimestamp();
    const blockNumberThen = web3.eth.blockNumber;
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
    if (currentPhase != phaseToEndIn) {
      const timeToNextPhase = getTimeToNextPhase(getCurrentTimestamp(), startOfDao.toNumber(), lockingPhaseDuration.toNumber(), quarterDuration.toNumber());
      await waitFor(timeToNextPhase);
    }
  };

  describe('setStartOfFirstQuarter', function () {
    const startTime = randomBigNumber(bN);
    const anotherStartTime = randomBigNumber(bN);
    before(async function () {
      // add a founder
      await contracts.daoIdentity.addGroupUser(bN(2), addressOf.founderBadgeHolder, randomBytes32());
      // add a prl
      await contracts.daoIdentity.addGroupUser(bN(3), addressOf.prl, randomBytes32());
      // add a kycadmin
      await contracts.daoIdentity.addGroupUser(bN(4), addressOf.kycadmin, randomBytes32());
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
    it('[founder set start]: success | verify read functions', async function () {
      assert.ok(await contracts.dao.setStartOfFirstQuarter.call(startTime, { from: addressOf.founderBadgeHolder }));
      await contracts.dao.setStartOfFirstQuarter(startTime, { from: addressOf.founderBadgeHolder });
      assert.deepEqual(await contracts.daoStorage.startOfFirstQuarter.call(), startTime);
    });
    it('[reset start]: revert', async function () {
      assert(await a.failure(contracts.dao.setStartOfFirstQuarter.call(
        anotherStartTime,
        { from: addressOf.founderBadgeHolder },
      )))
    });
  });

  describe('submitPreproposal', function () {
    const holderStake2 = bN(2 * (10 ** 18));
    const holderStake3 = bN(100);
    const holderStake4 = bN(1 * (10 ** 18));
    before(async function () {
      await phaseCorrection(phases.LOCKING_PHASE);
      // dgdHolder2 is a participant
      assert.isAtLeast((await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder2)).toNumber(), holderStake2);
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, holderStake2, { from: addressOf.dgdHolder2 });
      await contracts.daoStakeLocking.lockDGD(holderStake2, { from: addressOf.dgdHolder2 });
      // dgdHolder4 is a participant
      assert.isAtLeast((await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder4)).toNumber(), holderStake4);
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, holderStake4, { from: addressOf.dgdHolder4 });
      await contracts.daoStakeLocking.lockDGD(holderStake4, { from: addressOf.dgdHolder4 });
      // dgdHolder3 is not a participant
      assert.isAtLeast((await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder3)).toNumber(), holderStake3);
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, holderStake3, { from: addressOf.dgdHolder3 });
      await contracts.daoStakeLocking.lockDGD(holderStake3, { from: addressOf.dgdHolder3 });
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolder2), true);
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolder4), true);
      assert.deepEqual(await contracts.daoStakeStorage.isParticipant.call(addressOf.dgdHolder3), false);

      // kyc approve dgdHolder2 for 1 month
      const expiration = getCurrentTimestamp() + (60 * 60 * 24 * 30)
      await contracts.daoIdentity.updateKyc(addressOf.dgdHolder2, randomBytes32(), bN(expiration), { from: addressOf.kycadmin });
      assert.deepEqual(await contracts.identityStorage.is_kyc_approved.call(addressOf.dgdHolder2), true);
      assert.deepEqual(await contracts.identityStorage.is_kyc_approved.call(addressOf.dgdHolder4), false);
    });
    it('[not main phase]: revert', async function () {
      await phaseCorrection(phases.LOCKING_PHASE);
      assert(await a.failure(contracts.dao.submitPreproposal.call(
        proposalIds[0],
        milestoneDurations.firstProposal.versionOne,
        milestoneFundings.firstProposal.versionOne,
        { from: addressOf.dgdHolder2 },
      )));
    });
    it('[not a participant]: revert', async function () {
      await phaseCorrection(phases.MAIN_PHASE);
      assert(await a.failure(contracts.dao.submitPreproposal.call(
        proposalIds[0],
        milestoneDurations.firstProposal.versionOne,
        milestoneFundings.firstProposal.versionOne,
        { from: addressOf.dgdHolder3 },
      )));
    });
    it('[if milestone durations and fundings not valid]: revert', async function () {
      // TODO
    });
    it('[during main phase, participant, but not kyc approved]: revert', async function () {
      await phaseCorrection(phases.MAIN_PHASE);
      assert(await a.failure(contracts.dao.submitPreproposal.call(
        proposalIds[0],
        milestoneDurations.firstProposal.versionOne,
        milestoneFundings.firstProposal.versionOne,
        { from: addressOf.dgdHolder4 },
      )));
    });
    it('[valid inputs]: success | verify read functions', async function () {
      await phaseCorrection(phases.MAIN_PHASE);
      assert.deepEqual(await contracts.dao.submitPreproposal.call(
        proposalIds[0],
        milestoneDurations.firstProposal.versionOne,
        milestoneFundings.firstProposal.versionOne,
        { from: addressOf.dgdHolder2 },
      ), true);
      await contracts.dao.submitPreproposal(
        proposalIds[0],
        milestoneDurations.firstProposal.versionOne,
        milestoneFundings.firstProposal.versionOne,
        { from: addressOf.dgdHolder2 },
      );
      const readRes = await contracts.daoStorage.readProposal.call(proposalIds[0]);
      assert.deepEqual(readRes[0], proposalIds[0]);
      assert.deepEqual(readRes[1], addressOf.dgdHolder2);
      assert.deepEqual(readRes[2], EMPTY_ADDRESS);
      assert.deepEqual(readRes[3], proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL);
      assert.deepEqual(timeIsRecent(readRes[4], 2), true);
      assert.deepEqual(readRes[5], bN(1));
      assert.deepEqual(readRes[6], proposalIds[0]);
      assert.deepEqual(readRes[7], false);
      assert.deepEqual(await contracts.daoStorage.getFirstProposal.call(), proposalIds[0]);
      assert.deepEqual(await contracts.daoStorage.getLastProposal.call(), proposalIds[0]);
    });
    after(async function () {
      // withdraw stakes
      await phaseCorrection(phases.LOCKING_PHASE);
      await contracts.daoStakeLocking.withdrawDGD(holderStake2, { from: addressOf.dgdHolder2 });
      await contracts.daoStakeLocking.withdrawDGD(holderStake3, { from: addressOf.dgdHolder3 });
      await contracts.daoStakeLocking.withdrawDGD(holderStake4, { from: addressOf.dgdHolder4 });
    });
  });

  describe('endorseProposal', function () {
    const badgeStake2 = bN(1);
    const badgeStake3 = bN(1);
    const holderStake4 = bN(1 * (10 ** 18));
    before(async function () {
      // add one more proposal
      await phaseCorrection(phases.LOCKING_PHASE);
      // dgdHolder4 is a participant
      assert.isAtLeast((await contracts.dgdToken.balanceOf.call(addressOf.dgdHolder4)).toNumber(), holderStake4);
      await contracts.dgdToken.approve(contracts.daoStakeLocking.address, holderStake4, { from: addressOf.dgdHolder4 });
      await contracts.daoStakeLocking.lockDGD(holderStake4, { from: addressOf.dgdHolder4 });
      await contracts.daoIdentity.updateKyc(addressOf.dgdHolder4, randomBytes32(), bN(getCurrentTimestamp() + 36000), { from: addressOf.kycadmin });
      // badgeHolder2 is a badge participant
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, badgeStake2, { from: addressOf.badgeHolder2 });
      await contracts.daoStakeLocking.lockBadge(badgeStake2, { from: addressOf.badgeHolder2 });
      assert.deepEqual(await contracts.daoStakeStorage.isBadgeParticipant.call(addressOf.badgeHolder2), true);
      // badgeHolder3 is a badge participant
      await contracts.badgeToken.approve(contracts.daoStakeLocking.address, badgeStake3, { from: addressOf.badgeHolder3 });
      await contracts.daoStakeLocking.lockBadge(badgeStake3, { from: addressOf.badgeHolder3 });
      assert.deepEqual(await contracts.daoStakeStorage.isBadgeParticipant.call(addressOf.badgeHolder3), true);

      await phaseCorrection(phases.MAIN_PHASE);
      // add a pre-proposal
      await contracts.dao.submitPreproposal(
        proposalIds[1],
        milestoneDurations.secondProposal.versionOne,
        milestoneDurations.secondProposal.versionOne,
        { from: addressOf.dgdHolder4 },
      );
    });
    it('[if locking phase]: revert', async function () {
      await phaseCorrection(phases.LOCKING_PHASE);
      assert(await a.failure(contracts.dao.endorseProposal.call(
        proposalIds[1],
        { from: addressOf.badgeHolder2 },
      )));
    });
    it('[if not a badge participant]: revert', async function () {
      await phaseCorrection(phases.MAIN_PHASE);
      assert.deepEqual(await contracts.daoStakeStorage.isBadgeParticipant.call(addressOf.badgeHolder1), false);
      assert(await a.failure(contracts.dao.endorseProposal.call(
        proposalIds[1],
        { from: addressOf.badgeHolder1 },
      )));
    });
    it('[valid inputs]: success | verify read functions', async function () {
      assert.deepEqual(await contracts.daoStorage.readProposalState.call(proposalIds[1]), proposalStates(bN).PROPOSAL_STATE_PREPROPOSAL);
      await phaseCorrection(phases.MAIN_PHASE);
      assert.deepEqual(await contracts.dao.endorseProposal.call(
        proposalIds[1],
        { from: addressOf.badgeHolder2 },
      ), true);
      await contracts.dao.endorseProposal(proposalIds[1], { from: addressOf.badgeHolder2 });

      assert.deepEqual(await contracts.daoStorage.readProposalState.call(proposalIds[1]), proposalStates(bN).PROPOSAL_STATE_INITIAL);
      assert.deepEqual((await contracts.daoStorage.readProposal.call(proposalIds[1]))[2], addressOf.badgeHolder2);
      assert.deepEqual(timeIsRecent(await contracts.daoStorage.readProposalDraftVotingTime.call(proposalIds[1])), true);
    });
    it('[if proposal has already been endorsed]: revert', async function () {
      await phaseCorrection(phases.MAIN_PHASE);
      assert.deepEqual(await contracts.daoStakeStorage.isBadgeParticipant.call(addressOf.badgeHolder3), true);
      assert(await a.failure(contracts.dao.endorseProposal.call(
        proposalIds[1],
        { from: addressOf.badgeHolder3 },
      )));
    });
    after(async function () {
      // withdraw stakes
      await phaseCorrection(phases.LOCKING_PHASE);
      await contracts.daoStakeLocking.withdrawBadge(badgeStake2, { from: addressOf.badgeHolder2 });
      await contracts.daoStakeLocking.withdrawBadge(badgeStake3, { from: addressOf.badgeHolder3 });
    });
  });

  describe('modifyProposal', async function () {
    it('[if locking phase]: revert', async function () {

    });
    it('[if not proposer]: revert', async function () {

    });
    it('[if proposer, but kyc approval has expired]: revert', async function () {

    });
    it('[if proposal has already been vetted or funded]: revert', async function () {

    });
    it('[if milestone durations and fundings are not valid]: revert', async function () {

    });
    it('[valid]: success | verify read functions', async function () {
      // PRL should be false once updated
      // latest version should be the updated one
      // draft votes should have been reset in that
    });
  });
});
