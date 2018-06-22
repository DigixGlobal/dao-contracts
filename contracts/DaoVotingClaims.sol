pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "./common/DaoCommon.sol";
import "./service/DaoCalculatorService.sol";
import "./DaoFundingManager.sol";
import "./DaoRewardsManager.sol";

// @title Contract to claim voting results
// @author Digix Holdings
contract DaoVotingClaims is DaoCommon, Claimable {
    using DaoStructs for DaoStructs.VotingCount;
    using DaoStructs for DaoStructs.MilestoneInfo;
    using DaoStructs for DaoStructs.Users;
    uint256[] public uintLogs;
    address[] public addressLogs;

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

    // @notice Function to claim the draft voting result (can only be called by the proposal proposer)
    // @param _proposalId ID of the proposal
    // @return _passed Boolean, true if the draft voting has passed, reverted otherwise
    function claimDraftVotingResult(bytes32 _proposalId)
        public
        if_main_phase()
        if_draft_not_claimed(_proposalId)
        if_after_draft_voting_phase(_proposalId)
        if_from_proposer(_proposalId)
        returns (bool _passed)
    {
        address[] memory _allModerators = daoListingService().listModerators(daoStakeStorage().readTotalModerators(), true);

        DaoStructs.VotingCount memory _count;
        (_count.forCount, _count.againstCount, _count.quorum) = daoStorage().readDraftVotingCount(_proposalId, _allModerators);
        require(_count.quorum > daoCalculatorService().minimumDraftQuorum(_proposalId));
        require(daoCalculatorService().draftQuotaPass(_count.forCount, _count.againstCount));

        _passed = true;
        daoStorage().setProposalDraftPass(_proposalId, true);
        daoStorage().setProposalVotingTime(_proposalId, 0, calculateNextVotingTime(0, false));
        daoStorage().setDraftVotingClaim(_proposalId, true);
    }

    // @notice Function to claim the voting round results (can only be called by the proposal proposer)
    // @param _proposalId ID of the proposal
    // @return _passed Boolean, true if the voting round is passed, revert otherwise
    function claimVotingResult(bytes32 _proposalId)
        public
        if_main_phase()
        if_not_claimed(_proposalId, 0)
        if_after_reveal_phase(_proposalId)
        if_from_proposer(_proposalId)
        returns (bool _passed)
    {
        address[] memory _allStakeHolders = daoListingService().listParticipants(daoStakeStorage().readTotalParticipant(), true);
        DaoStructs.VotingCount memory _count;
        (_count.forCount, _count.againstCount, _count.quorum) = daoStorage().readVotingCount(_proposalId, 0, _allStakeHolders);
        require(_count.quorum > daoCalculatorService().minimumVotingQuorum(_proposalId, 0));
        require(daoCalculatorService().votingQuotaPass(_count.forCount, _count.againstCount));
        _passed = true;
        daoStorage().setProposalPass(_proposalId, 0, _passed);
        daoStorage().setVotingClaim(_proposalId, 0, true); // 0 for voting, interim starts from 1

        // set deadline of milestone 1 (set startTime for next interim voting round)
        DaoStructs.MilestoneInfo memory _info;
        (_info.index, _info.duration, _info.funding,) = daoStorage().readProposalMilestone(_proposalId, 0);
        daoStorage().setProposalVotingTime(_proposalId, 1, calculateNextVotingTime(_info.duration, true));

        daoFundingManager().allocateEth(daoStorage().readProposalProposer(_proposalId), _info.funding);
    }

    // @notice Function to claim the interim voting round results (can only be called by the proposer)
    // @param _proposalId ID of the proposal
    // @param _index Index of the interim voting round
    // @return _passed Boolean, true if the interim voting round passed, false if failed
    function claimInterimVotingResult(bytes32 _proposalId, uint256 _index)
        public
        if_main_phase()
        if_not_claimed(_proposalId, _index)
        if_after_interim_reveal_phase(_proposalId, _index)
        returns (bool _passed)
    {
        require(daoStorage().readProposalProposer(_proposalId) == msg.sender);
        address[] memory _allStakeHolders = daoListingService().listParticipants(10000, true);
        DaoStructs.VotingCount memory _count;
        DaoStructs.Users memory _bonusVoters;
        (_count.forCount, _count.againstCount, _count.quorum) = daoStorage().readVotingCount(_proposalId, _index, _allStakeHolders);
        if ((_count.quorum > daoCalculatorService().minimumVotingQuorum(_proposalId, _index)) &&
            (daoCalculatorService().votingQuotaPass(_count.forCount, _count.againstCount))) {
            _passed = true;
        } else {
            _passed = false;
        }
        daoStorage().setProposalPass(_proposalId, _index, _passed);
        daoStorage().setVotingClaim(_proposalId, _index, true);

        if (_passed) {
            // give quarter points to proposer for finishing the milestone
            daoPointsStorage().addQuarterPoint(daoStorage().readProposalProposer(_proposalId), get_uint_config(CONFIG_QUARTER_POINT_MILESTONE_COMPLETION), currentQuarterIndex());

            // give bonus points for all those who
            // voted YES in the previous round
            (_bonusVoters.users, _bonusVoters.usersLength) = daoStorage().readVotingRoundVotes(_proposalId, _index-1, _allStakeHolders, true);

            // set deadline for next milestone (set startTime for next interim voting round)
            DaoStructs.MilestoneInfo memory _info;
            (_info.index, _info.duration, _info.funding, _info.finalReward) = daoStorage().readProposalMilestone(_proposalId, _index);
            if (_info.duration > 0 && _info.funding > 0) {
                daoStorage().setProposalVotingTime(_proposalId, _index + 1, calculateNextVotingTime(_info.duration, true));
                // update claimable funds
                daoFundingManager().allocateEth(daoStorage().readProposalProposer(_proposalId), _info.funding);
            } else {
                // give final reward
                daoFundingManager().allocateEth(daoStorage().readProposalProposer(_proposalId), _info.finalReward);
            }
        } else {
            // give bonus points for all those who
            // voted NO in the previous round
            (_bonusVoters.users, _bonusVoters.usersLength) = daoStorage().readVotingRoundVotes(_proposalId, _index-1, _allStakeHolders, false);
        }

        if (_bonusVoters.usersLength > 0) addBonusReputation(_bonusVoters.users, _bonusVoters.usersLength);
    }

    // @notice Function to claim the voting result on special proposal
    // @param _proposalId ID of the special proposal
    // @return _passed Boolean, true if voting passed, false if failed
    function claimSpecialProposalVotingResult(bytes32 _proposalId)
        public
        if_main_phase()
        if_from_special_proposer(_proposalId)
        if_not_claimed_special(_proposalId)
        if_after_reveal_phase_special(_proposalId)
        returns (bool _passed)
    {
        address[] memory _allStakeHolders = daoListingService().listParticipants(10000, true);
        DaoStructs.VotingCount memory _count;
        (_count.forCount, _count.againstCount, _count.quorum) = daoSpecialStorage().readVotingCount(_proposalId, _allStakeHolders);
        if ((_count.quorum > daoCalculatorService().minimumVotingQuorumForSpecial()) &&
            (daoCalculatorService().votingQuotaForSpecialPass(_count.forCount, _count.againstCount))) {
            _passed = true;
        }
        daoSpecialStorage().setPass(_proposalId, _passed);
        daoSpecialStorage().setVotingClaim(_proposalId, true);
        if (_passed) {
            setConfigs(_proposalId);
        }
    }

    function addBonusReputation(address[] _voters, uint256 _n)
        private
    {
        uintLogs.push(_n);
        uint256 _qp = get_uint_config(CONFIG_QUARTER_POINT_VOTE);
        uint256 _rate = get_uint_config(CONFIG_BONUS_REPUTATION_NUMERATOR);
        uint256 _base = get_uint_config(CONFIG_BONUS_REPUTATION_DENOMINATOR);

        uint256 _bonus = (_qp * _rate * get_uint_config(CONFIG_REPUTATION_PER_EXTRA_QP_NUM))
            / (_base * get_uint_config(CONFIG_REPUTATION_PER_EXTRA_QP_DEN));

        for (uint256 i = 0; i < _n; i++) {
            daoPointsStorage().addReputation(_voters[i], _bonus);
        }
    }

    function calculateNextVotingTime(uint256 _time, bool _isInterim)
        private
        returns (uint256 _votingTime)
    {
        _votingTime = now + _time;
        uint256 _timeToGo = getTimeFromNextLockingPhase(now + _time);
        if (timeInQuarter(_votingTime) < get_uint_config(CONFIG_LOCKING_PHASE_DURATION)) {
            _votingTime += get_uint_config(CONFIG_LOCKING_PHASE_DURATION) - timeInQuarter(_votingTime) + 1;
        } else {
            if (_isInterim) {
                if (_timeToGo < get_uint_config(CONFIG_INTERIM_PHASE_TOTAL)) {
                    _votingTime += _timeToGo + get_uint_config(CONFIG_LOCKING_PHASE_DURATION) + 1;
                }
            } else {
                if (_timeToGo < get_uint_config(CONFIG_VOTING_PHASE_TOTAL)) {
                    _votingTime += _timeToGo + get_uint_config(CONFIG_LOCKING_PHASE_DURATION) + 1;
                }
            }
        }
    }

    function setConfigs(bytes32 _proposalId)
        private
    {
        uint256[] memory _uintConfigs;
        address[] memory _addressConfigs;
        bytes32[] memory _bytesConfigs;
        (
            _uintConfigs,
            _addressConfigs,
            _bytesConfigs
        ) = daoSpecialStorage().readConfigs(_proposalId);
        daoConfigsStorage().updateUintConfigs(_uintConfigs);
    }

}
