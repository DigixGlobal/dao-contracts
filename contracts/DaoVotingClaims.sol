pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "./common/DaoCommon.sol";
import "./service/DaoCalculatorService.sol";
import "./DaoFundingManager.sol";
import "./DaoRewardsManager.sol";
import "./lib/DaoIntermediateStructs.sol";
import "./lib/DaoStructs.sol";

/// @title Contract to claim voting results
/// @author Digix Holdings
contract DaoVotingClaims is DaoCommon, Claimable {
    using DaoIntermediateStructs for DaoIntermediateStructs.VotingCount;
    using DaoIntermediateStructs for DaoIntermediateStructs.MilestoneInfo;
    using DaoIntermediateStructs for DaoIntermediateStructs.Users;
    using DaoStructs for DaoStructs.IntermediateResults;

    function daoCalculatorService()
        internal
        returns (DaoCalculatorService _contract)
    {
        _contract = DaoCalculatorService(get_contract(CONTRACT_SERVICE_DAO_CALCULATOR));
    }

    function daoFundingManager()
        internal
        returns (DaoFundingManager _contract)
    {
        _contract = DaoFundingManager(get_contract(CONTRACT_DAO_FUNDING_MANAGER));
    }

    function daoRewardsManager()
        internal
        returns (DaoRewardsManager _contract)
    {
        _contract = DaoRewardsManager(get_contract(CONTRACT_DAO_REWARDS_MANAGER));
    }

    function DaoVotingClaims(address _resolver) public {
        require(init(CONTRACT_DAO_VOTING_CLAIMS, _resolver));
    }

    /// @notice Function to claim the draft voting result (can only be called by the proposal proposer)
    /// @param _proposalId ID of the proposal
    /// @return _passed Boolean, true if the draft voting has passed, reverted otherwise
    function claimDraftVotingResult(
        bytes32 _proposalId,
        uint256 _count
    )
        public
        if_main_phase()
        if_draft_not_claimed(_proposalId)
        if_after_draft_voting_phase(_proposalId)
        returns (bool _passed)
    {
        // if after the claiming deadline, its auto failed
        if (now > daoStorage().readProposalDraftVotingTime(_proposalId)
                    .add(get_uint_config(CONFIG_DRAFT_VOTING_PHASE))
                    .add(get_uint_config(CONFIG_VOTE_CLAIMING_DEADLINE))) {
            daoStorage().setProposalDraftPass(_proposalId, false);
            return false;
        }
        require(msg.sender == daoStorage().readProposalProposer(_proposalId));

        // get the previously stored intermediary state
        DaoStructs.IntermediateResults memory _currentResults;
        (
            _currentResults.countedUntil,
            _currentResults.currentForCount,
            _currentResults.currentAgainstCount,
            _currentResults.currentQuorum,
        ) = intermediateResultsStorage().getIntermediateResults(_proposalId);

        // get first address based on intermediate state
        address[] memory _moderators;
        if (_currentResults.countedUntil == EMPTY_ADDRESS) {
            _moderators = daoListingService().listModerators(
                _count,
                true
            );
        } else {
            _moderators = daoListingService().listModeratorsFrom(
               _currentResults.countedUntil,
               _count,
               true
           );
        }

        // get moderators
        address _moderator = _moderators[_moderators.length-1];

        // count the votes for this batch of moderators
        DaoIntermediateStructs.VotingCount memory _voteCount;
        (_voteCount.forCount, _voteCount.againstCount, _voteCount.quorum) = daoStorage().readDraftVotingCount(_proposalId, _moderators);

        _currentResults.countedUntil = _moderator;
        _currentResults.currentForCount = _currentResults.currentForCount.add(_voteCount.forCount);
        _currentResults.currentAgainstCount = _currentResults.currentAgainstCount.add(_voteCount.againstCount);
        _currentResults.currentQuorum = _currentResults.currentQuorum.add(_voteCount.quorum);

        if (_moderator == daoStakeStorage().readLastModerator()) {
            // this is the last iteration
            _passed = true;
            processDraftVotingClaim(_proposalId, _currentResults);

            // reset intermediate result for the proposal
            intermediateResultsStorage().resetIntermediateResults(_proposalId);
        } else {
            // update intermediate results
            intermediateResultsStorage().setIntermediateResults(
                _proposalId,
                _currentResults.countedUntil,
                _currentResults.currentForCount,
                _currentResults.currentAgainstCount,
                _currentResults.currentQuorum,
                0
            );
        }
    }

    function processDraftVotingClaim(bytes32 _proposalId, DaoStructs.IntermediateResults _currentResults)
        internal
    {
        require(_currentResults.currentQuorum > daoCalculatorService().minimumDraftQuorum(_proposalId));
        require(daoCalculatorService().draftQuotaPass(_currentResults.currentForCount, _currentResults.currentAgainstCount));
        daoStorage().setProposalDraftPass(_proposalId, true);
        // set startTime of first voting round
        // and the start of first milestone.
        setTimelineForNextMilestone(
            _proposalId,
            0,
            0,
            daoStorage().readProposalDraftVotingTime(_proposalId).add(get_uint_config(CONFIG_DRAFT_VOTING_PHASE))
        );
        daoStorage().setDraftVotingClaim(_proposalId, true);
    }

    // NOTE: Voting round i-th is before milestone index i-th


    /// @notice Function to claim the  voting round results (can only be called by the proposer)
    /// @param _proposalId ID of the proposal
    /// @param _index Index of the  voting round
    /// @return _passed Boolean, true if the  voting round passed, false if failed
    function claimProposalVotingResult(bytes32 _proposalId, uint256 _index, uint256 _operations)
        public
        if_main_phase()
        if_not_claimed(_proposalId, _index)
        if_after_proposal_reveal_phase(_proposalId, _index)
        returns (bool _passed, bool _done)
    {
        // anyone can claim after the claiming deadline is over;
        // and the result will be failed by default
        _done = true;
        if (now < daoStorage().readProposalNextMilestoneStart(_proposalId, _index)
                    .add(get_uint_config(CONFIG_VOTE_CLAIMING_DEADLINE)))
        {
            (_operations, _passed, _done) = countProposalVote(_proposalId, _index, _operations);
            if (!_done) return (_passed, false); // haven't done counting yet, return
        }
        _done = false;

        if (_index > 0) { // We only need to do bonus calculation if its the interim voting round
            _done = calculateVoterBonus(_proposalId, _index, _operations, _passed);
            if (!_done) return (_passed, false);
        }
        if (_passed) {
            setTimelineAndManageFunding(_proposalId, _index);
        }
        daoStorage().setVotingClaim(_proposalId, _index, true);
        daoStorage().setProposalPass(_proposalId, _index, _passed);
        _done = true;
    }

    function setTimelineAndManageFunding(bytes32 _proposalId, uint256 _index)
        internal
    {
        DaoIntermediateStructs.MilestoneInfo memory _info;
        (_info.index, _info.duration, _info.funding) = daoStorage().readProposalMilestone(_proposalId, _index);
        _info.milestoneStart = daoStorage().readProposalNextMilestoneStart(_proposalId, _index);

        if (_info.duration > 0 && _info.funding > 0 && !isProposalPaused(_proposalId)) {
            setTimelineForNextMilestone(_proposalId, _index.add(1), _info.duration, _info.milestoneStart);
        }
        daoFundingManager().allocateEth(daoStorage().readProposalProposer(_proposalId), _info.funding);

        daoPointsStorage().addQuarterPoint(
            daoStorage().readProposalProposer(_proposalId),
            get_uint_config(CONFIG_QUARTER_POINT_MILESTONE_COMPLETION_PER_10000ETH).mul(_info.funding).div(10000 ether),
            currentQuarterIndex()
        );
    }

    function calculateVoterBonus(bytes32 _proposalId, uint256 _index, uint256 _operations, bool _passed)
        internal
        returns (bool _done)
    {
        if (_operations == 0) return false;
        address _countedUntil;
        (_countedUntil,,,,) = intermediateResultsStorage().getIntermediateResults(_proposalId);

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
        address _lastVoter = _voterBatch[_voterBatch.length - 1]; // this will fail if _voterBatch is empty

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
        if (_bonusVoters.usersLength > 0) addBonusReputation(_bonusVoters.users, _bonusVoters.usersLength);

        if (_lastVoter == daoStakeStorage().readLastParticipant()) {
            // this is the last iteration

            intermediateResultsStorage().resetIntermediateResults(_proposalId);
            _done = true;
        } else {
            // this is not the last iteration yet
            intermediateResultsStorage().setIntermediateResults(_proposalId, _lastVoter, 0, 0, 0, 0);
        }
    }

    function countProposalVote(bytes32 _proposalId, uint256 _index, uint256 _operations)
        internal
        returns (uint256 _operationsLeft, bool _passed, bool _done)
    {
        require(daoStorage().readProposalProposer(_proposalId) == msg.sender);

        DaoStructs.IntermediateResults memory _currentResults;
        (
            _currentResults.countedUntil,
            _currentResults.currentForCount,
            _currentResults.currentAgainstCount,
            _currentResults.currentQuorum,
        ) = intermediateResultsStorage().getIntermediateResults(_proposalId);
        address[] memory _voters;
        if (_currentResults.countedUntil == EMPTY_ADDRESS) {
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

            // There's no more operations to be done, or there's no voters to count
            if (_operations == 0 || _voters.length == 0) {
                return (_operations, false, true);
            }
        }

        address _lastVoter = _voters[_voters.length - 1];

        DaoIntermediateStructs.VotingCount memory _count;
        (_count.forCount, _count.againstCount, _count.quorum) = daoStorage().readVotingCount(_proposalId, _index, _voters);

        _currentResults.currentForCount = _currentResults.currentForCount.add(_count.forCount);
        _currentResults.currentAgainstCount = _currentResults.currentAgainstCount.add(_count.againstCount);
        _currentResults.currentQuorum = _currentResults.currentQuorum.add(_count.quorum);
        intermediateResultsStorage().setIntermediateResults(
            _proposalId,
            _lastVoter,
            _currentResults.currentForCount,
            _currentResults.currentAgainstCount,
            _currentResults.currentQuorum,
            0
        );

        if (_lastVoter != daoStakeStorage().readLastParticipant()) {
            return (0, false, false); // hasn't done counting yet
        }

        // this means all votes have already been counted
        intermediateResultsStorage().resetIntermediateResults(_proposalId);
        _operationsLeft = _operations.sub(_voters.length);
        _done = true;

        if ((_currentResults.currentQuorum > daoCalculatorService().minimumVotingQuorum(_proposalId, _index)) &&
            (daoCalculatorService().votingQuotaPass(_currentResults.currentForCount, _currentResults.currentAgainstCount)))
        {
            _passed = true;
        }
    }

    function updateTimelineForNextMilestone(
        bytes32 _proposalId,
        uint256 _index,
        uint256 _milestoneDuration,
        uint256 _milestoneStart
    )
        public
        if_sender_is(CONTRACT_DAO)
    {
        setTimelineForNextMilestone(_proposalId, _index, _milestoneDuration, _milestoneStart);
    }

    // set the voting start time for milestone index _index (starts from 0)
    // as well as setting the startOfNextMilestone of the voting round of milestone index _index (starts from 0)
    function setTimelineForNextMilestone(
        bytes32 _proposalId,
        uint256 _index,
        uint256 _milestoneDuration,
        uint256 _milestoneStart
    )
        internal
    {
        uint256 _votingTime = _milestoneStart.add(_milestoneDuration);
        uint256 _timeLeftInQuarter = getTimeLeftInQuarter(_votingTime);
        uint256 _votingDuration = get_uint_config(_index == 0 ? CONFIG_VOTING_PHASE_TOTAL : CONFIG_INTERIM_PHASE_TOTAL);
        if (timeInQuarter(_votingTime) < get_uint_config(CONFIG_LOCKING_PHASE_DURATION)) {
            _votingTime = _votingTime.add(
                get_uint_config(CONFIG_LOCKING_PHASE_DURATION).sub(timeInQuarter(_votingTime)).add(1)
            );
        } else if (_timeLeftInQuarter < _votingDuration.add(get_uint_config(CONFIG_VOTE_CLAIMING_DEADLINE))) {
            _votingTime = _votingTime.add(
                _timeLeftInQuarter.add(get_uint_config(CONFIG_LOCKING_PHASE_DURATION)).add(1)
            );
        }

        daoStorage().setProposalVotingTime(_proposalId, _index, _votingTime);
        daoStorage().setProposalNextMilestoneStart(_proposalId, _index, _votingTime.add(_votingDuration));
    }

    function addBonusReputation(address[] _voters, uint256 _n)
        private
    {
        uint256 _qp = get_uint_config(CONFIG_QUARTER_POINT_VOTE);
        uint256 _rate = get_uint_config(CONFIG_BONUS_REPUTATION_NUMERATOR);
        uint256 _base = get_uint_config(CONFIG_BONUS_REPUTATION_DENOMINATOR);

        uint256 _bonus = _qp.mul(_rate).mul(get_uint_config(CONFIG_REPUTATION_PER_EXTRA_QP_NUM))
            .div(
                _base.mul(get_uint_config(CONFIG_REPUTATION_PER_EXTRA_QP_DEN))
            );

        for (uint256 i = 0; i < _n; i++) {
            daoPointsStorage().addReputation(_voters[i], _bonus);
        }
    }

}
