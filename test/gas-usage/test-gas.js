const {
  deployFreshDao,
  setupParticipantsStates,
  getTestProposals,
  getParticipants,
  updateKyc,
  waitFor,
  phaseCorrection,
  printProposalDetails,
  // assignVotesAndCommits,
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
  const BATCH_SIZE = 2;

  let proposals;

  const resetBeforeEach = async function () {
    await deployFreshDao(libs, contracts, addressOf, accounts, bN, web3);
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_VOTE_CLAIMING_DEADLINE, bN(10000));
    await setupParticipantsStates(web3, contracts, addressOf, bN);
    proposals = getTestProposals(bN, addressOf);
    await contracts.daoIdentity.addGroupUser(bN(3), addressOf.prl, randomBytes32());
    await contracts.daoIdentity.addGroupUser(bN(4), addressOf.kycadmin, randomBytes32());
    await updateKyc(contracts, addressOf, getParticipants(addressOf, bN));
    await contracts.daoConfigsStorage.mock_set_uint_config(daoConstantsKeys().CONFIG_DRAFT_VOTING_PHASE, bN(1));
  };

  const setupVotes = async function (n) {
    const mockModerators = randomAddresses(n);
    const mockVotes = new Array(n).fill().map(() => { return true; });
    const mockVoteWeights = randomBigNumbers(bN, n, (50 * (10 ** 9)));

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

    for (const i of indexRange(0, 2000)) {
      if ((i * BATCH_SIZE) >= n) break;
      await contracts.daoStakeStorage.mock_add_moderators(mockModerators.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), mockVoteWeights.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(0),
        true,
        mockModerators.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
        mockVotes.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
        mockVoteWeights.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
        bN(BATCH_SIZE),
        bN(getCurrentTimestamp() - 10),
      );
    }
    await waitFor(2, addressOf, web3);
    return {
      mockModerators,
      mockVotes,
      mockVoteWeights,
    };
  };

  const draftVotingFor = async function (n) {
    await setupVotes(n);
    let totalGasUsed = 0;
    for (const i of indexRange(0, 2000)) {
      if ((i * BATCH_SIZE) >= n + 2) break; // there are 2 moderators created in resetBeforeEach()
      const tx = await contracts.daoVotingClaims.claimDraftVotingResult(
        proposals[0].id,
        bN(BATCH_SIZE),
        { from: proposals[0].proposer },
      );
      totalGasUsed += tx.receipt.gasUsed;
      console.log('intermediary step ', (i + 1), ', gasUsed = ', tx.receipt.gasUsed);
      console.log('\tIntermediate result = ', await contracts.intermediateResultsStorage.getIntermediateResults.call(proposals[0].id));
    }
    console.log('n = ', n, ', total gas used = ', totalGasUsed);
    console.log('');
    console.log('proposals[0] voting result = ', await contracts.daoStorage.readProposalDraftVotingResult.call(proposals[0].id));
  };

  const votingFor = async function (n) {
    const mockParticipants = randomAddresses(n);
    const mockVotes = new Array(n).fill().map(() => { return true; });
    const mockVoteWeights = randomBigNumbers(bN, n, (50 * (10 ** 9)));
    // const { salt, votes, votingCommits } = assignVotesAndCommits(
    //   null,
    //   1,
    //   n,
    //   mockParticipants,
    // );
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

    await printProposalDetails(contracts, proposals[0]);

    for (const i of indexRange(0, 2000)) {
      if ((i * BATCH_SIZE) >= n) break;
      const currentVoterBatch = mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      await contracts.daoStakeStorage.mock_add_participants(currentVoterBatch, mockVoteWeights.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));
      // await contracts.daoStakeStorage.mock_add_dgd_stake(
      //   currentVoterBatch,
      //   mockVoteWeights.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
      // );
      await contracts.daoStorage.mock_put_past_votes(
        proposals[0].id,
        bN(1),
        false,
        mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
        mockVotes.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
        mockVoteWeights.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
        bN(BATCH_SIZE),
        bN(getCurrentTimestamp() - 10),
      );
    }
    const allParticipants = await contracts.daoListingService.listParticipants(bN(1000), true);
    console.log('All participants: ', allParticipants);
    console.log('\tlength = ', allParticipants.length);

    console.log('Proposal next milestone start = ', await contracts.daoStorage.readProposalNextMilestoneStart.call(proposals[0].id, bN(1)));

    await waitFor(21, addressOf, web3);
    let totalGasUsed = 0;
    console.log('Before claiming votes');

    for (const i of indexRange(0, 2000)) {
      if ((i * BATCH_SIZE) >= 2 * (n + 4)) break; // need to account for the 4 particpants added in resetBeforeEach()

      const tx = await contracts.daoVotingClaims.claimProposalVotingResult(
        proposals[0].id,
        bN(1),
        bN(BATCH_SIZE),
        { from: proposals[0].proposer },
      );
      totalGasUsed += tx.receipt.gasUsed;
      console.log('intermediary step ', (i + 1), ', gasUsed = ', tx.receipt.gasUsed);
      console.log('\tIntermediate result = ', await contracts.intermediateResultsStorage.getIntermediateResults.call(proposals[0].id));
    }
    console.log('n = ', n, ', total gas used = ', totalGasUsed);
    console.log('');
    console.log('proposals[0] voting result = ', await contracts.daoStorage.readProposalDraftVotingResult.call(proposals[0].id));
  };

  const setupPoints = async function (n) {
    const mockParticipants = randomAddresses(n);
    const mockVoteWeights = randomBigNumbers(bN, n, (50 * (10 ** 9)));
    const mockQP = randomBigNumbers(bN, n, 100);
    const mockModeratorQP = randomBigNumbers(bN, n, 50);
    const mockRP = randomBigNumbers(bN, n, 200);

    for (const i of indexRange(0, 2000)) {
      if ((i * BATCH_SIZE) >= n) break;
      await contracts.daoStakeStorage.mock_add_participants(mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), mockVoteWeights.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));
      // await contracts.daoStakeStorage.mock_add_dgd_stake(mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), mockWeights.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));
      await contracts.daoPointsStorage.mock_set_qp(mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), mockQP.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), bN(1));
      await contracts.daoPointsStorage.mock_set_moderator_qp(mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), mockModeratorQP.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), bN(1));
      await contracts.daoPointsStorage.mock_set_rp(mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), mockRP.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));

      // let the second half of participants be moderators;
      if (i * BATCH_SIZE >= n / 2) {
        await contracts.daoStakeStorage.mock_add_moderators(mockParticipants.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE), mockVoteWeights.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));
        console.log('added moderators');
      }
    }
  };

  const calculateGlobalRewardsFor = async function (n) {
    await setupPoints(n);
    await phaseCorrection(web3, contracts, addressOf, phases.LOCKING_PHASE);
    let totalGas = 0;

    const allParticipants = await contracts.daoListingService.listParticipants(bN(1000), true);
    console.log('All participants: ', allParticipants);
    console.log('\tlength = ', allParticipants.length);

    const allModerators = await contracts.daoListingService.listModerators(bN(1000), true);
    console.log('All moderators: ', allModerators);
    console.log('\tlength = ', allModerators.length);
    console.log('\tLast mod = ', await contracts.daoStakeStorage.readLastModerator.call());

    for (const i of indexRange(0, 2000)) {
      if ((i * BATCH_SIZE) >= allModerators.length + (n + 4)) break; // there are n+4 participants and some moderators
      const tx = await contracts.daoRewardsManager.calculateGlobalRewardsBeforeNewQuarter(bN(BATCH_SIZE), { from: addressOf.founderBadgeHolder });
      totalGas += tx.receipt.gasUsed;
      console.log('\nintermediary step ', (i + 1), ', gasUsed = ', tx.receipt.gasUsed);
      // console.log('\t\tIntermediate results for part 1 = ', await contracts.intermediateResultsStorage.getIntermediateResults.call(await contracts.daoRewardsManager.testBytes.call()));
      // console.log('\t\t\tIntermediate results for part 2 = ', await contracts.intermediateResultsStorage.getIntermediateResults.call(await contracts.daoRewardsManager.testBytes2.call()));
    }
    console.log('n = ', n, ', gas used = ', totalGas);
  };

  const countVotesFor = async function (n) {
    const properties = await setupVotes(n);
    for (const i of indexRange(0, 2000)) {
      if ((i * BATCH_SIZE) >= n) break;
      // const moderators = await contracts.daoListingService.listModerators.call(
      //   (i + 1) * 50,
      //   true,
      // );
      console.log('size = ', (i + 1) * BATCH_SIZE, ', ', await contracts.daoStorage.readDraftVotingCount.call(
        proposals[0].id,
        properties.mockModerators.slice(0, (i + 1) * BATCH_SIZE),
        // moderators,
      ));
    }
  };

  describe('Gas Estimate', function () {
    it('[claimDraftVotingResult]', async function () {
      // for (const i of indexRange(20, 21)) {
      await resetBeforeEach();
      await draftVotingFor(10);
      // }
    });
    it('[claimVotingResult]', async function () {
      // for (const i of indexRange(20, 21)) {
      await resetBeforeEach();
      await votingFor(10);
      // }
    });
    it('[calculateGlobalRewardsBeforeNewQuarter]', async function () {
      await resetBeforeEach();
      await calculateGlobalRewardsFor(10);
    });
    it('[countVotes]', async function () {
      // for (const i of indexRange(40, 41)) {
      await resetBeforeEach();
      await countVotesFor(10);
      // }
    });
  });
});
