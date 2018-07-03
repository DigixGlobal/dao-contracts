pragma solidity ^0.4.19;

import "./../storage/DaoStorage.sol";

contract MockDaoStorage is DaoStorage {
    using DoublyLinkedList for DoublyLinkedList.Bytes;

    function MockDaoStorage(address _resolver) public DaoStorage(_resolver) {}

    /**
    @notice Function to mock add new proposal in pre-defined state
    @dev Note that this function will only be called during the tests
    @param _proposalId ID of the proposal, i.e. IPFS doc hash
    @param _roundIndex Index of the voting round, if not draft phase
    @param _proposer Address of the proposer
    @param _endorser Address of the endorser
    @param _milestonesDurations Uint Array of the milestone durations
    @param _milestonesFundings Uint Array of the milestone fundings
    @param _isDraftPhase Boolean, true if adding proposal in draft phase
    @param _finalReward Final rewards on completion of proposal
    */
    function mock_put_proposal_as(
        bytes32 _proposalId,
        uint256 _roundIndex,
        bool _isDraftPhase,
        address _proposer,
        address _endorser,
        uint256[] _milestonesDurations,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
    {
        allProposals.append(_proposalId);
        proposalsById[_proposalId].proposalId = _proposalId;
        proposalsById[_proposalId].proposer = _proposer;
        proposalsById[_proposalId].timeCreated = now - (1 minutes);
        proposalsById[_proposalId].proposalVersionDocs.append(_proposalId);
        proposalsById[_proposalId].proposalVersions[_proposalId].docIpfsHash = _proposalId;
        proposalsById[_proposalId].proposalVersions[_proposalId].created = now;
        proposalsById[_proposalId].proposalVersions[_proposalId].milestoneCount = _milestonesFundings.length;
        proposalsById[_proposalId].proposalVersions[_proposalId].milestoneDurations = _milestonesDurations;
        proposalsById[_proposalId].proposalVersions[_proposalId].milestoneFundings = _milestonesFundings;
        proposalsById[_proposalId].proposalVersions[_proposalId].finalReward = _finalReward;
        proposalsById[_proposalId].endorser = _endorser;
        proposalsById[_proposalId].finalVersion = _proposalId;
        if (_isDraftPhase) {
            proposalsByState[PROPOSAL_STATE_DRAFT].append(_proposalId);
            proposalsById[_proposalId].currentState = PROPOSAL_STATE_DRAFT;
            proposalsById[_proposalId].draftVoting.startTime = now;
        } else {
            if (_roundIndex == 0) {
                proposalsByState[PROPOSAL_STATE_MODERATED].append(_proposalId);
                proposalsById[_proposalId].currentState = PROPOSAL_STATE_MODERATED;
            } else {
                proposalsByState[PROPOSAL_STATE_ONGOING].append(_proposalId);
                proposalsById[_proposalId].currentState = PROPOSAL_STATE_ONGOING;
            }
            proposalsById[_proposalId].votingRounds[_roundIndex].startTime = now;
        }
    }
}
