const {
  deployFreshDao,
  setupParticipantsStates,
  getTestProposals,
  getParticipants,
  updateKyc,
  waitFor,
  phaseCorrection,
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
    const mockWeights = randomBigNumbers(bN, n, (50 * (10 ** 18)));
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
    for (const i of indexRange(0, 20)) {
      const tx = await contracts.daoVotingClaims.claimDraftVotingResult(
        proposals[0].id,
        bN(50),
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
    const mockWeights = randomBigNumbers(bN, n, (50 * (10 ** 18)));
    const mockQP = randomBigNumbers(bN, n, 100);
    const mockModeratorQP = randomBigNumbers(bN, n, 50);
    const mockRP = randomBigNumbers(bN, n, 200);
    for (const i of indexRange(0, 20)) {
      if ((i * 50) >= n) break;
      await contracts.daoStakeStorage.mock_add_participants(mockParticipants.slice(i * 50, (i + 1) * 50));
      // console.log('added participants');
      await contracts.daoStakeStorage.mock_add_dgd_stake(mockParticipants.slice(i * 50, (i + 1) * 50), mockWeights.slice(i * 50, (i + 1) * 50));
      // console.log('added dgd stake');
      await contracts.daoPointsStorage.mock_set_qp(mockParticipants.slice(i * 50, (i + 1) * 50), mockQP.slice(i * 50, (i + 1) * 50), bN(1));
      // console.log('added quarter points');
      await contracts.daoPointsStorage.mock_set_moderator_qp(mockParticipants.slice(i * 50, (i + 1) * 50), mockModeratorQP.slice(i * 50, (i + 1) * 50), bN(1));
      // console.log('added moderator quarter points');
      await contracts.daoPointsStorage.mock_set_rp(mockParticipants.slice(i * 50, (i + 1) * 50), mockRP.slice(i * 50, (i + 1) * 50));
      // console.log('added reputation points');
    }
    await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
    const tx = await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter({ from: addressOf.founderBadgeHolder });
    console.log('n = ', n, ', gas used = ', tx.receipt.gasUsed);
  };

  describe('Gas Estimate', function () {
    it('[claimDraftVotingResult]', async function () {
      for (const i of indexRange(20, 21)) {
        await resetBeforeEach();
        await draftVotingFor(i * 50);
      }
    });
    // it('[calculateGlobalRewardsBeforeNewQuarter]', async function () {
    //   for (const i of indexRange(1, 20)) {
    //     await resetBeforeEach();
    //     await calculateGlobalRewardsFor(i * 50);
    //   }
    // });
  });
});
