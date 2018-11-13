pragma solidity ^0.4.24;

import "../../storage/DaoStorage.sol";

contract MockDaoStorage is DaoStorage {
    using DoublyLinkedList for DoublyLinkedList.Bytes;

    constructor(address _resolver) public DaoStorage(_resolver) {}

    /**
    @notice Function to mock add new proposal in pre-defined state
    @dev Note that this function will only be called during the tests
    @param _proposalId ID of the proposal, i.e. IPFS doc hash
    @param _roundIndex Index of the voting round, if not draft phase
    @param _proposer Address of the proposer
    @param _endorser Address of the endorser
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
        proposalsById[_proposalId].proposalVersions[_proposalId].milestoneFundings = _milestonesFundings;
        proposalsById[_proposalId].proposalVersions[_proposalId].finalReward = _finalReward;
        proposalsById[_proposalId].endorser = _endorser;
        proposalsById[_proposalId].finalVersion = _proposalId;
        proposalsById[_proposalId].collateralAmount = 2 ether;
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

    function mock_put_proposal_in_milestone(
        bytes32 _proposalId,
        uint256 _milestoneId,
        address _proposer,
        address _endorser,
        uint256[] _milestonesFundings,
        uint256 _finalReward,
        uint256 _previousVotingStart
    )
        public
    {
        allProposals.append(_proposalId);
        proposalsById[_proposalId].proposalId = _proposalId;
        proposalsById[_proposalId].proposer = _proposer;
        proposalsById[_proposalId].timeCreated = now - (5 minutes);
        proposalsById[_proposalId].proposalVersionDocs.append(_proposalId);
        proposalsById[_proposalId].proposalVersions[_proposalId].docIpfsHash = _proposalId;
        proposalsById[_proposalId].proposalVersions[_proposalId].created = now;
        proposalsById[_proposalId].proposalVersions[_proposalId].milestoneCount = _milestonesFundings.length;
        proposalsById[_proposalId].proposalVersions[_proposalId].milestoneFundings = _milestonesFundings;
        proposalsById[_proposalId].proposalVersions[_proposalId].finalReward = _finalReward;
        proposalsById[_proposalId].endorser = _endorser;
        proposalsById[_proposalId].finalVersion = _proposalId;
        proposalsById[_proposalId].votingRounds[_milestoneId].startTime = _previousVotingStart;
        proposalsById[_proposalId].votingRounds[_milestoneId].claimed = true;
        proposalsById[_proposalId].votingRounds[_milestoneId].passed = true;
        proposalsById[_proposalId].votingRounds[_milestoneId].funded = true;
    }

    /**
    @notice Mock function to add fake votes in the past for a proposal
    @dev This will never be available in the deployment, only for test purposes
    @param _proposalId ID of the proposal
    @param _roundIndex Index of the voting round
    @param _isDraftPhase Boolean, whether updating the votes for draft phase or not
    @param _voters Array of addresses of the voters
    @param _votes Boolean array of the votes (for or against)
    @param _weights Uint array of the voting weights
    @param _length Length of the above arrays (number of voters)
    @param _startOfVotingRound start of this voting round
    */
    function mock_put_past_votes(
        bytes32 _proposalId,
        uint256 _roundIndex,
        bool _isDraftPhase,
        address[] _voters,
        bool[] _votes,
        uint256[] _weights,
        uint256 _length,
        uint256 _startOfVotingRound
    )
        public
    {
        DaoStructs.Voting storage _voting = proposalsById[_proposalId].votingRounds[_roundIndex];
        if (_isDraftPhase) {
            _voting = proposalsById[_proposalId].draftVoting;
        } else {
            proposalsById[_proposalId].votingRounds[_roundIndex].startTime = _startOfVotingRound;
        }

        for (uint256 i = 0; i < _length; i++) {
            if (_votes[i] == true) {
                _voting.yesVotes[_voters[i]] = _weights[i];
            } else {
                _voting.noVotes[_voters[i]] = _weights[i];
            }
        }
    }
}
