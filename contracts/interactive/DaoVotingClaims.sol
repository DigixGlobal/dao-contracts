pragma solidity ^0.4.24;

import "../common/DaoCommon.sol";
import "../service/DaoCalculatorService.sol";
import "./DaoFundingManager.sol";
import "./DaoRewardsManager.sol";
import "../lib/DaoIntermediateStructs.sol";
import "../lib/DaoStructs.sol";


/**
@title Contract to claim voting results
@author Digix Holdings
*/
contract DaoVotingClaims is DaoCommon {
    using DaoIntermediateStructs for DaoIntermediateStructs.VotingCount;
    using DaoIntermediateStructs for DaoIntermediateStructs.Users;
    using DaoStructs for DaoStructs.IntermediateResults;

    function daoCalculatorService()
        internal
        constant
        returns (DaoCalculatorService _contract)
    {
        _contract = DaoCalculatorService(get_contract(CONTRACT_SERVICE_DAO_CALCULATOR));
    }

    function daoFundingManager()
        internal
        constant
        returns (DaoFundingManager _contract)
    {
        _contract = DaoFundingManager(get_contract(CONTRACT_DAO_FUNDING_MANAGER));
    }

    function daoRewardsManager()
        internal
        constant
        returns (DaoRewardsManager _contract)
    {
        _contract = DaoRewardsManager(get_contract(CONTRACT_DAO_REWARDS_MANAGER));
    }

    constructor(address _resolver) public {
        require(init(CONTRACT_DAO_VOTING_CLAIMS, _resolver));
    }


    /**
    @notice Function to claim the draft voting result (can only be called by the proposal proposer)
    @dev The founder/or anyone is supposed to call this function after the claiming deadline has passed, to clean it up and close this proposal.
         If this voting fails, the collateral will be refunded
    @param _proposalId ID of the proposal
    @param _operations Number of operations to do in this call
    @return {
      "_passed": "Boolean, true if the draft voting has passed, false if the claiming deadline has passed or the voting has failed",
      "_done": "Boolean, true if the calculation has finished"
    }
    */
    function claimDraftVotingResult(
        bytes32 _proposalId,
        uint256 _operations
    )
        public
        ifDraftNotClaimed(_proposalId)
        ifAfterDraftVotingPhase(_proposalId)
        returns (bool _passed, bool _done)
    {
        // if after the claiming deadline, or the limit for non-digix proposals is reached, its auto failed
        if (now > daoStorage().readProposalDraftVotingTime(_proposalId)
                    .add(getUintConfig(CONFIG_DRAFT_VOTING_PHASE))
                    .add(getUintConfig(CONFIG_VOTE_CLAIMING_DEADLINE))
            || !isNonDigixProposalsWithinLimit(_proposalId))
        {
            daoStorage().setProposalDraftPass(_proposalId, false);
            daoStorage().setDraftVotingClaim(_proposalId, true);
            processCollateralRefund(_proposalId);
            return (false, true);
        }
        require(isFromProposer(_proposalId));
        senderCanDoProposerOperations();

        // get the previously stored intermediary state
        DaoStructs.IntermediateResults memory _currentResults;
        (
            _currentResults.countedUntil,
            _currentResults.currentForCount,
            _currentResults.currentAgainstCount,
        ) = intermediateResultsStorage().getIntermediateResults(_proposalId);

        // get the moderators to calculate in this transaction, based on intermediate state
        address[] memory _moderators;
        if (_currentResults.countedUntil == EMPTY_ADDRESS) {
            _moderators = daoListingService().listModerators(
                _operations,
                true
            );
        } else {
            _moderators = daoListingService().listModeratorsFrom(
               _currentResults.countedUntil,
               _operations,
               true
           );
        }

        // count the votes for this batch of moderators
        DaoIntermediateStructs.VotingCount memory _voteCount;
        (_voteCount.forCount, _voteCount.againstCount) = daoStorage().readDraftVotingCount(_proposalId, _moderators);

        _currentResults.countedUntil = _moderators[_moderators.length-1];
        _currentResults.currentForCount = _currentResults.currentForCount.add(_voteCount.forCount);
        _currentResults.currentAgainstCount = _currentResults.currentAgainstCount.add(_voteCount.againstCount);

        if (_moderators[_moderators.length-1] == daoStakeStorage().readLastModerator()) {
            // this is the last iteration
            _passed = processDraftVotingClaim(_proposalId, _currentResults);
            _done = true;

            // reset intermediate result for the proposal.
            intermediateResultsStorage().resetIntermediateResults(_proposalId);
        } else {
            // update intermediate results
            intermediateResultsStorage().setIntermediateResults(
                _proposalId,
                _currentResults.countedUntil,
                _currentResults.currentForCount,
                _currentResults.currentAgainstCount,
                0
            );
        }
    }


    function processDraftVotingClaim(bytes32 _proposalId, DaoStructs.IntermediateResults _currentResults)
        internal
        returns (bool _passed)
    {
        if (
            (_currentResults.currentForCount.add(_currentResults.currentAgainstCount) > daoCalculatorService().minimumDraftQuorum(_proposalId)) &&
            (daoCalculatorService().draftQuotaPass(_currentResults.currentForCount, _currentResults.currentAgainstCount))
        ) {
            daoStorage().setProposalDraftPass(_proposalId, true);

            // set startTime of first voting round
            // and the start of first milestone.
            uint256 _idealStartTime = daoStorage().readProposalDraftVotingTime(_proposalId).add(getUintConfig(CONFIG_DRAFT_VOTING_PHASE));
            daoStorage().setProposalVotingTime(
                _proposalId,
                0,
                getTimelineForNextVote(0, _idealStartTime)
            );
            _passed = true;
        } else {
            daoStorage().setProposalDraftPass(_proposalId, false);
            processCollateralRefund(_proposalId);
        }

        daoStorage().setDraftVotingClaim(_proposalId, true);
    }

    /// NOTE: Voting round i-th is before milestone index i-th


    /**
    @notice Function to claim the  voting round results
    @dev This function has two major steps:
         - Counting the votes
            + There is no need for this step if there are some conditions that makes the proposal auto failed
            + The number of operations needed for this step is the number of participants in the quarter
         - Calculating the bonus for the voters in the preceding round
            + We can skip this step if this is the Voting round 0 (there is no preceding voting round to calculate bonus)
            + The number of operations needed for this step is the number of participants who voted "correctly" in the preceding voting round
         Step 1 will have to finish first before step 2. The proposer is supposed to call this function repeatedly,
         until _done is true

         If the voting round fails, the collateral will be returned back to the proposer
    @param _proposalId ID of the proposal
    @param _index Index of the  voting round
    @param _operations Number of operations to do in this call
    @return {
      "_passed": "Boolean, true if the  voting round passed, false if failed"
    }
    */
    function claimProposalVotingResult(bytes32 _proposalId, uint256 _index, uint256 _operations)
        public
        ifNotClaimed(_proposalId, _index)
        ifAfterProposalRevealPhase(_proposalId, _index)
        returns (bool _passed, bool _done)
    {
        require(isMainPhase());

        // STEP 1
        // If the claiming deadline is over, the proposal is auto failed, and anyone can call this function
        // Here, _done is refering to whether STEP 1 is done
        _done = true;
        _passed = false; // redundant, put here just to emphasize that its false
        // In other words, we only need to do Step 1 if its before the deadline
        if (now < startOfMilestone(_proposalId, _index)
                    .add(getUintConfig(CONFIG_VOTE_CLAIMING_DEADLINE)))
        {
            (_operations, _passed, _done) = countProposalVote(_proposalId, _index, _operations);
            // from here on, _operations is the number of operations left, after Step 1 is done
            if (!_done) return (_passed, false); // haven't done Step 1 yet, return. The value of _passed here is irrelevant
        }

        // STEP 2
        // from this point onwards, _done refers to step 2
        _done = false;


        //TODO: until here
        if (_index > 0) { // We only need to do bonus calculation if its a interim voting round
            _done = calculateVoterBonus(_proposalId, _index, _operations, _passed);
            if (!_done) return (_passed, false); // Step 2 is not done yet, return
        } else {
            // its the first voting round, we return the collateral if it fails, locks if it passes

            _passed = _passed && isNonDigixProposalsWithinLimit(_proposalId); // can only pass if its within the non-digix proposal limit
            if (_passed) {
                daoStorage().setProposalCollateralStatus(
                    _proposalId,
                    COLLATERAL_STATUS_LOCKED
                );

            } else {
                processCollateralRefund(_proposalId);
            }
        }

        if (_passed) {
            processSuccessfulVotingClaim(_proposalId, _index);
        }
        daoStorage().setVotingClaim(_proposalId, _index, true);
        daoStorage().setProposalPass(_proposalId, _index, _passed);
        _done = true;
    }


    // do the necessary steps after a successful voting round.
    function processSuccessfulVotingClaim(bytes32 _proposalId, uint256 _index)
        internal
    {
        // clear the intermediate results for the proposal, so that next voting rounds can reuse the same key <proposal_id> for the intermediate results
        intermediateResultsStorage().resetIntermediateResults(_proposalId);

        // if this was the final voting round, unlock their original collateral
        uint256[] memory _milestoneFundings;
        (_milestoneFundings,) = daoStorage().readProposalFunding(_proposalId);
        if (_index == _milestoneFundings.length) {
            processCollateralRefund(_proposalId);
        }

        // increase the non-digix proposal count accordingly
        bool _isDigixProposal;
        (,,,,,,,,,_isDigixProposal) = daoStorage().readProposal(_proposalId);
        if (_index == 0 && !_isDigixProposal) {
            daoStorage().addNonDigixProposalCountInQuarter(currentQuarterIndex());
        }

        // Add quarter point for the proposer
        uint256 _funding = daoStorage().readProposalMilestone(_proposalId, _index);
        daoPointsStorage().addQuarterPoint(
            daoStorage().readProposalProposer(_proposalId),
            getUintConfig(CONFIG_QUARTER_POINT_MILESTONE_COMPLETION_PER_10000ETH).mul(_funding).div(10000 ether),
            currentQuarterIndex()
        );
    }


    function getInterResultKeyForBonusCalculation(bytes32 _proposalId) public view returns (bytes32 _key) {
        _key = keccak256(abi.encodePacked(
            _proposalId,
            INTERMEDIATE_BONUS_CALCULATION_IDENTIFIER
        ));
    }


    // calculate and update the bonuses for voters who voted "correctly" in the preceding voting round
    function calculateVoterBonus(bytes32 _proposalId, uint256 _index, uint256 _operations, bool _passed)
        internal
        returns (bool _done)
    {
        if (_operations == 0) return false;
        address _countedUntil;
        (_countedUntil,,,) = intermediateResultsStorage().getIntermediateResults(
            getInterResultKeyForBonusCalculation(_proposalId)
        );

        address[] memory _voterBatch;
        if (_countedUntil == EMPTY_ADDRESS) {
            _voterBatch = daoListingService().listParticipants(
                _operations,
                true
            );
        } else {
            _voterBatch = daoListingService().listParticipantsFrom(
                _countedUntil,
                _operations,
                true
            );
        }
        address _lastVoter = _voterBatch[_voterBatch.length - 1]; // this will fail if _voterBatch is empty. However, there is at least the proposer as a participant in the quarter.

        DaoIntermediateStructs.Users memory _bonusVoters;
        if (_passed) {

            // give bonus points for all those who
            // voted YES in the previous round
            (_bonusVoters.users, _bonusVoters.usersLength) = daoStorage().readVotingRoundVotes(_proposalId, _index.sub(1), _voterBatch, true);
        } else {
            // give bonus points for all those who
            // voted NO in the previous round
            (_bonusVoters.users, _bonusVoters.usersLength) = daoStorage().readVotingRoundVotes(_proposalId, _index.sub(1), _voterBatch, false);
        }
        //TODO: to here
        if (_bonusVoters.usersLength > 0) addBonusReputation(_bonusVoters.users, _bonusVoters.usersLength);

        if (_lastVoter == daoStakeStorage().readLastParticipant()) {
            // this is the last iteration

            intermediateResultsStorage().resetIntermediateResults(
                getInterResultKeyForBonusCalculation(_proposalId)
            );
            _done = true;
        } else {
            // this is not the last iteration yet, save the intermediate results
            intermediateResultsStorage().setIntermediateResults(
                getInterResultKeyForBonusCalculation(_proposalId),
                _lastVoter, 0, 0, 0
            );
        }
    }


    // Count the votes for a Voting Round and find out if its passed
    /// @return _operationsLeft The number of operations left after the calculations in this function
    /// @return _passed Whether this voting round passed
    /// @return _done Whether the calculation for this step 1 is already done. If its not done, this function will need to run again in subsequent transactions
    /// until _done is true
    function countProposalVote(bytes32 _proposalId, uint256 _index, uint256 _operations)
        internal
        returns (uint256 _operationsLeft, bool _passed, bool _done)
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));

        DaoStructs.IntermediateResults memory _currentResults;
        (
            _currentResults.countedUntil,
            _currentResults.currentForCount,
            _currentResults.currentAgainstCount,
        ) = intermediateResultsStorage().getIntermediateResults(_proposalId);
        address[] memory _voters;
        if (_currentResults.countedUntil == EMPTY_ADDRESS) { // This is the first transaction to count votes for this voting round
            _voters = daoListingService().listParticipants(
                _operations,
                true
            );
        } else {
            _voters = daoListingService().listParticipantsFrom(
                _currentResults.countedUntil,
                _operations,
                true
            );

            // If there's no voters left to count, this means that STEP 1 is already done, just return whether it was passed
            // Note that _currentResults should already be storing the final tally of votes for this voting round, as already calculated in previous iterations of this function
            if (_voters.length == 0) {
                return (
                    _operations,
                    isVoteCountPassed(_currentResults, _proposalId, _index),
                    true
                );
            }
        }

        address _lastVoter = _voters[_voters.length - 1];

        DaoIntermediateStructs.VotingCount memory _count;
        (_count.forCount, _count.againstCount) = daoStorage().readVotingCount(_proposalId, _index, _voters);

        _currentResults.currentForCount = _currentResults.currentForCount.add(_count.forCount);
        _currentResults.currentAgainstCount = _currentResults.currentAgainstCount.add(_count.againstCount);
        intermediateResultsStorage().setIntermediateResults(
            _proposalId,
            _lastVoter,
            _currentResults.currentForCount,
            _currentResults.currentAgainstCount,
            0
        );

        if (_lastVoter != daoStakeStorage().readLastParticipant()) {
            return (0, false, false); // hasn't done STEP 1 yet. The parent function (claimProposalVotingResult) should return after this. More transactions are needed to continue the calculation
        }

        // If it comes to here, this means all votes have already been counted
        // From this point, the IntermediateResults struct will store the total tally of the votes for this voting round until processSuccessfulVotingClaim() is called,
        // which will reset it.

        _operationsLeft = _operations.sub(_voters.length);
        _done = true;

        _passed = isVoteCountPassed(_currentResults, _proposalId, _index);
    }


    function isVoteCountPassed(DaoStructs.IntermediateResults _currentResults, bytes32 _proposalId, uint256 _index)
        internal
        view
        returns (bool _passed)
    {
        _passed = (_currentResults.currentForCount.add(_currentResults.currentAgainstCount) > daoCalculatorService().minimumVotingQuorum(_proposalId, _index))
                && (daoCalculatorService().votingQuotaPass(_currentResults.currentForCount, _currentResults.currentAgainstCount));
    }


    function processCollateralRefund(bytes32 _proposalId)
        internal
    {
        daoStorage().setProposalCollateralStatus(_proposalId, COLLATERAL_STATUS_CLAIMED);
        require(daoFundingManager().refundCollateral(daoStorage().readProposalProposer(_proposalId), _proposalId));
    }


    // add bonus reputation for voters that voted "correctly" in the preceding voting round AND is currently participating this quarter
    function addBonusReputation(address[] _voters, uint256 _n)
        private
    {
        uint256 _qp = getUintConfig(CONFIG_QUARTER_POINT_VOTE);
        uint256 _rate = getUintConfig(CONFIG_BONUS_REPUTATION_NUMERATOR);
        uint256 _base = getUintConfig(CONFIG_BONUS_REPUTATION_DENOMINATOR);

        uint256 _bonus = _qp.mul(_rate).mul(getUintConfig(CONFIG_REPUTATION_PER_EXTRA_QP_NUM))
            .div(
                _base.mul(getUintConfig(CONFIG_REPUTATION_PER_EXTRA_QP_DEN))
            );

        for (uint256 i = 0; i < _n; i++) {
            if (isParticipant(_voters[i])) { // only give bonus reputation to current participants
                daoPointsStorage().addReputation(_voters[i], _bonus);
            }
        }
    }

}
