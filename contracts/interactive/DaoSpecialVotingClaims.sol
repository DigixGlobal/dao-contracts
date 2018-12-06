pragma solidity ^0.4.25;

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
contract DaoSpecialVotingClaims is DaoCommon {
    using DaoIntermediateStructs for DaoIntermediateStructs.VotingCount;
    using DaoStructs for DaoStructs.IntermediateResults;

    event SpecialProposalClaim(bytes32 indexed _proposalId, bool _result);

    function daoCalculatorService()
        internal
        view
        returns (DaoCalculatorService _contract)
    {
        _contract = DaoCalculatorService(get_contract(CONTRACT_SERVICE_DAO_CALCULATOR));
    }

    function daoFundingManager()
        internal
        view
        returns (DaoFundingManager _contract)
    {
        _contract = DaoFundingManager(get_contract(CONTRACT_DAO_FUNDING_MANAGER));
    }

    function daoRewardsManager()
        internal
        view
        returns (DaoRewardsManager _contract)
    {
        _contract = DaoRewardsManager(get_contract(CONTRACT_DAO_REWARDS_MANAGER));
    }

    constructor(address _resolver) public {
        require(init(CONTRACT_DAO_SPECIAL_VOTING_CLAIMS, _resolver));
    }


    /**
    @notice Function to claim the voting result on special proposal
    @param _proposalId ID of the special proposal
    @return {
      "_passed": "Boolean, true if voting passed, throw if failed, returns false if passed deadline"
    }
    */
    function claimSpecialProposalVotingResult(bytes32 _proposalId, uint256 _operations)
        public
        ifNotClaimedSpecial(_proposalId)
        ifAfterRevealPhaseSpecial(_proposalId)
        returns (bool _passed)
    {
        require(isMainPhase());
        if (now > daoSpecialStorage().readVotingTime(_proposalId)
                    .add(getUintConfig(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL))
                    .add(getUintConfig(CONFIG_VOTE_CLAIMING_DEADLINE))) {
            daoSpecialStorage().setPass(_proposalId, false);
            return false;
        }
        require(msg.sender == daoSpecialStorage().readProposalProposer(_proposalId));

        if (_operations == 0) { // if no operations are passed, return false
            return (false);
        }

        DaoStructs.IntermediateResults memory _currentResults;
        (
            _currentResults.countedUntil,
            _currentResults.currentForCount,
            _currentResults.currentAgainstCount,
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
        (_voteCount.forCount, _voteCount.againstCount) = daoSpecialStorage().readVotingCount(_proposalId, _voters);

        _currentResults.countedUntil = _lastVoter;
        _currentResults.currentForCount = _currentResults.currentForCount.add(_voteCount.forCount);
        _currentResults.currentAgainstCount = _currentResults.currentAgainstCount.add(_voteCount.againstCount);

        if (_lastVoter == daoStakeStorage().readLastParticipant()) {
            // this is already the last transaction, we have counted all the votes

            if (
                (_currentResults.currentForCount.add(_currentResults.currentAgainstCount) > daoCalculatorService().minimumVotingQuorumForSpecial()) &&
                (daoCalculatorService().votingQuotaForSpecialPass(_currentResults.currentForCount, _currentResults.currentAgainstCount))
            ) {
                _passed = true;
                setConfigs(_proposalId);
            }
            daoSpecialStorage().setPass(_proposalId, _passed);
            daoSpecialStorage().setVotingClaim(_proposalId, true);
            emit SpecialProposalClaim(_proposalId, _passed);
        } else {
            intermediateResultsStorage().setIntermediateResults(
                _proposalId,
                _currentResults.countedUntil,
                _currentResults.currentForCount,
                _currentResults.currentAgainstCount,
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
