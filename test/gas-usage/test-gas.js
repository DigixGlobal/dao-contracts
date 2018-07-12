const {
  deployFreshDao,
  setupParticipantsStates,
  getTestProposals,
  getParticipants,
  updateKyc,
  waitFor,
  phaseCorrection,
  printProposalDetails,
} = require('../setup');

const {
  daoConstantsKeys,
  phases,
} = require('../daoHelpers');

const {
  randomBytes32,
  randomAddresses,
  randomBigNumbers,
  getCurrentTimestamp,
  indexRange,
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
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_DRAFT_VOTING_PHASE, bN(1));
  };

  const draftVotingFor = async function (n) {
    const mockModerators = randomAddresses(n);
    const mockVotes = new Array(n).fill().map(() => { return true; });
    const mockWeights = randomBigNumbers(bN, n, (50 * (10 ** 9)));
    await contracts.daoStorage.mock_put_proposal_as(
      proposals[0].id,
      bN(0),
      true,
      proposals[0].proposer,
      proposals[0].endorser,
      proposals[0].versions[0].milestoneDurations,
      proposals[0].versions[0].milestoneFundings,
      proposals[0].versions[0].finalReward,
    );

    await printProposalDetails(contracts, proposals[0]);
    console.log('min Quorum :', (await contracts.daoCalculatorService.minimumDraftQuorum.call(proposals[0].id)).toNumber());

    for (const i of indexRange(0, 20)) {
      if ((i * 50) >= n) break;
      await contracts.daoStakeStorage.mock_add_moderators(mockModerators.slice(i * 50, (i + 1) * 50));
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(0),
        true,
        mockModerators.slice(i * 50, (i + 1) * 50),
        mockVotes.slice(i * 50, (i + 1) * 50),
        mockWeights.slice(i * 50, (i + 1) * 50),
        bN(50),
        bN(getCurrentTimestamp() - 10),
      );
    }
    await waitFor(2, addressOf, web3);
    let totalGasUsed = 0;
    for (const i of indexRange(0, 10)) {
      const tx = await contracts.daoVotingClaims.claimDraftVotingResult(
        proposals[0].id,
        bN(100),
        { from: proposals[0].proposer },
      );
      totalGasUsed += tx.receipt.gasUsed;
      console.log('intermediary step ', (i + 1), ', gasUsed = ', tx.receipt.gasUsed);
    }
    console.log('n = ', n, ', total gas used = ', totalGasUsed);
    console.log('');
    console.log('proposals[0] voting result = ', await contracts.daoStorage.readProposalDraftVotingResult.call(proposals[0].id));
  };

  const calculateGlobalRewardsFor = async function (n) {
    const mockParticipants = randomAddresses(n);
    const mockWeights = randomBigNumbers(bN, n, (50 * (10 ** 9)));
    const mockQP = randomBigNumbers(bN, n, 100);
    const mockModeratorQP = randomBigNumbers(bN, n, 50);
    const mockRP = randomBigNumbers(bN, n, 200);
    const BATCH_SIZE = 50;

    for (const i of indexRange(0, 2000)) {
      if ((i * BATCH_SIZE) >= n) break;
      await contracts.daoStakeStorage.mock_add_participants(mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));
      // console.log('added participants');
      await contracts.daoStakeStorage.mock_add_dgd_stake(mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), mockWeights.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));
      // console.log('added dgd stake');
      await contracts.daoPointsStorage.mock_set_qp(mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), mockQP.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), bN(1));
      // console.log('added quarter points');
      await contracts.daoPointsStorage.mock_set_moderator_qp(mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), mockModeratorQP.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), bN(1));
      // console.log('added moderator quarter points');
      await contracts.daoPointsStorage.mock_set_rp(mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), mockRP.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));
      // console.log('added reputation points');

      // let the second half of participants be moderators;
      if (i * BATCH_SIZE >= n / 2) {
        await contracts.daoStakeStorage.mock_add_moderators(mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));
        console.log('added moderators');
      }
    }
    await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
    let totalGas = 0;
    console.log('All participants: ', await contracts.daoListingService.listParticipants(bN(1000), true));
    for (const i of indexRange(0, 2000)) {
      if ((i * BATCH_SIZE) >= n) break;
      const tx = await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(BATCH_SIZE), { from: addressOf.founderBadgeHolder });
      totalGas += tx.receipt.gasUsed;
      console.log('\tdid one tx, gas = ', tx.receipt.gasUsed);
      console.log('\tIntermediate results = ', await contracts.intermediateResultsStorage.getIntermediateResults.call(
        await contracts.daoRewardsManager.testBytes.call()
      ));
    }
    console.log('n = ', n, ', gas used = ', totalGas);
  };

  describe('Gas Estimate', function () {
    it('[claimDraftVotingResult]', async function () {
      for (const i of indexRange(20, 21)) {
        await resetBeforeEach();
        await draftVotingFor(i * 50);
      }
    });
    it('[calculateGlobalRewardsBeforeNewQuarter]', async function () {
      await resetBeforeEach();
      await calculateGlobalRewardsFor(1500);

      // for (const i of indexRange(1, 20)) {
      //   await calculateGlobalRewardsFor(i * 50);
      // }
    });
  });
});
