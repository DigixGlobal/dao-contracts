pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "../common/DaoCommon.sol";
import "../service/DaoCalculatorService.sol";
import "./DaoFundingManager.sol";
import "./DaoRewardsManager.sol";
import "../lib/DaoIntermediateStructs.sol";
import "../lib/DaoStructs.sol";

/// @title Contract to claim voting results
/// @author Digix Holdings
contract DaoSpecialVotingClaims is DaoCommon, Claimable {
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

    function DaoSpecialVotingClaims(address _resolver) public {
        require(init(CONTRACT_DAO_SPECIAL_VOTING_CLAIMS, _resolver));
    }

    /// @notice Function to claim the voting result on special proposal
    /// @param _proposalId ID of the special proposal
    /// @return _passed Boolean, true if voting passed, throw if failed, returns false if passed deadline
    function claimSpecialProposalVotingResult(bytes32 _proposalId, uint256 _operations)
        public
        ifNotClaimedSpecial(_proposalId)
        ifAfterRevealPhaseSpecial(_proposalId)
        returns (bool _passed)
    {
        require(isMainPhase());
        if (now > daoSpecialStorage().readVotingTime(_proposalId)
                    .add(get_uint_config(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL))
                    .add(get_uint_config(CONFIG_VOTE_CLAIMING_DEADLINE))) {
            daoSpecialStorage().setPass(_proposalId, false);
            return false;
        }
        require(msg.sender == daoSpecialStorage().readProposalProposer(_proposalId));

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
        }

        address _lastVoter = _voters[_voters.length - 1];

        DaoIntermediateStructs.VotingCount memory _voteCount;
        (_voteCount.forCount, _voteCount.againstCount, _voteCount.quorum) = daoSpecialStorage().readVotingCount(_proposalId, _voters);

        _currentResults.countedUntil = _lastVoter;
        _currentResults.currentForCount = _currentResults.currentForCount.add(_voteCount.forCount);
        _currentResults.currentAgainstCount = _currentResults.currentAgainstCount.add(_voteCount.againstCount);
        _currentResults.currentQuorum = _currentResults.currentQuorum.add(_voteCount.quorum);

        if (_lastVoter == daoStakeStorage().readLastParticipant()) {
            if (
                (_currentResults.currentQuorum > daoCalculatorService().minimumVotingQuorumForSpecial()) &&
                (daoCalculatorService().votingQuotaForSpecialPass(_currentResults.currentForCount, _currentResults.currentAgainstCount))
            ) {
                _passed = true;
                setConfigs(_proposalId);
            }
            daoSpecialStorage().setPass(_proposalId, _passed);
            daoSpecialStorage().setVotingClaim(_proposalId, true);

            intermediateResultsStorage().resetIntermediateResults(_proposalId);
        } else {
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
