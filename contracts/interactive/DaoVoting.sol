pragma solidity ^0.4.25;

import "../common/DaoCommon.sol";

/**
@title Contract for all voting operations of DAO
@author Digix Holdings
*/
contract DaoVoting is DaoCommon {

    constructor(address _resolver) public {
        require(init(CONTRACT_DAO_VOTING, _resolver));
    }


    /**
    @notice Function to vote on draft proposal (only Moderators can vote)
    @param _proposalId ID of the proposal
    @param _voteYes Boolean, true if voting for, false if voting against
    */
    function voteOnDraft(
        bytes32 _proposalId,
        bool _voteYes
    )
        public
        ifDraftVotingPhase(_proposalId)
    {
        require(isMainPhase());
        require(isModerator(msg.sender));
        address _moderator = msg.sender;
        uint256 _moderatorStake = daoStakeStorage().lockedDGDStake(_moderator);

        uint256 _voteWeight;
        (,_voteWeight) = daoStorage().readDraftVote(_proposalId, _moderator);

        daoStorage().addDraftVote(_proposalId, _moderator, _voteYes, _moderatorStake);

        if (_voteWeight == 0) { // just voted the first time
            daoPointsStorage().addModeratorQuarterPoint(_moderator, getUintConfig(CONFIG_QUARTER_POINT_DRAFT_VOTE), currentQuarterIndex());
        }
    }


    /**
    @notice Function to commit a vote on special proposal
    @param _proposalId ID of the proposal
    @param _commitHash Hash of the vote to commit (hash = SHA3(address(pub_address), bool(vote), bytes(random string)))
    @return {
      "_success": "Boolean, true if vote was committed successfully"
    }
    */
    function commitVoteOnSpecialProposal(
        bytes32 _proposalId,
        bytes32 _commitHash
    )
        public
        ifCommitPhaseSpecial(_proposalId)
    {
        require(isParticipant(msg.sender));
        daoSpecialStorage().commitVote(_proposalId, _commitHash, msg.sender);
    }


    /**
    @notice Function to reveal a committed vote on special proposal
    @dev The lockedDGDStake that would be counted behind a participant's vote is his lockedDGDStake when this function is called
    @param _proposalId ID of the proposal
    @param _vote Boolean, true if voted for, false if voted against
    @param _salt Random bytes used to commit vote
    */
    function revealVoteOnSpecialProposal(
        bytes32 _proposalId,
        bool _vote,
        bytes32 _salt
    )
        public
        ifRevealPhaseSpecial(_proposalId)
        hasNotRevealedSpecial(_proposalId)
    {
        require(isParticipant(msg.sender));
        require(keccak256(abi.encodePacked(msg.sender, _vote, _salt)) == daoSpecialStorage().readComittedVote(_proposalId, msg.sender));
        daoSpecialStorage().revealVote(_proposalId, msg.sender, _vote, daoStakeStorage().lockedDGDStake(msg.sender));
        daoPointsStorage().addQuarterPoint(msg.sender, getUintConfig(CONFIG_QUARTER_POINT_VOTE), currentQuarterIndex());
    }


    /**
    @notice Function to commit a vote on proposal (Voting Round)
    @param _proposalId ID of the proposal
    @param _index Index of the Voting Round
    @param _commitHash Hash of the vote to commit (hash = SHA3(address(pub_address), bool(vote), bytes32(random string)))
    */
    function commitVoteOnProposal(
        bytes32 _proposalId,
        uint8 _index,
        bytes32 _commitHash
    )
        public
        ifCommitPhase(_proposalId, _index)
    {
        require(isParticipant(msg.sender));
        daoStorage().commitVote(_proposalId, _commitHash, msg.sender, _index);
    }


    /**
    @notice Function to reveal a committed vote on proposal (Voting Round)
    @dev The lockedDGDStake that would be counted behind a participant's vote is his lockedDGDStake when this function is called
    @param _proposalId ID of the proposal
    @param _index Index of the Voting Round
    @param _vote Boolean, true if voted for, false if voted against
    @param _salt Random bytes used to commit vote
    */
    function revealVoteOnProposal(
        bytes32 _proposalId,
        uint8 _index,
        bool _vote,
        bytes32 _salt
    )
        public
        ifRevealPhase(_proposalId, _index)
        hasNotRevealed(_proposalId, _index)
    {
        require(isParticipant(msg.sender));
        require(keccak256(abi.encodePacked(msg.sender, _vote, _salt)) == daoStorage().readComittedVote(_proposalId, _index, msg.sender));
        daoStorage().revealVote(_proposalId, msg.sender, _vote, daoStakeStorage().lockedDGDStake(msg.sender), _index);
        daoPointsStorage().addQuarterPoint(
            msg.sender,
            getUintConfig(_index == 0 ? CONFIG_QUARTER_POINT_VOTE : CONFIG_QUARTER_POINT_INTERIM_VOTE),
            currentQuarterIndex()
        );
    }
}
