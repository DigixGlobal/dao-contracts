pragma solidity ^0.4.19;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "./common/DaoCommon.sol";

contract Dao is DaoCommon {
    function Dao(address _resolver) public {
        require(init(CONTRACT_DAO, _resolver));
    }

    function submitPreproposal(
        bytes32 _docIpfsHash,
        uint256[] _milestoneDurations,
        uint256[] _milestonesFundings
    )
        public
        if_main_phase()
        returns (bool _success)
    {
        address _proposer = msg.sender;
        require(identity_storage().is_kyc_approved(_proposer));
        /* createProposal(_docIpfsHash, _milestoneDurations, _milestonesFundings); */
        _success = true;
    }

    function endorseProposal(bytes32 _proposalId)
        public
        if_main_phase()
    {
        address _endorser = msg.sender;

        // endorser must be a Badge
        require(stakeStorage().readUserLockedBadge(_endorser) > 0);

        // proposal must be a preproposal
        require(daoStorage().readProposalState(_proposalId) == PROPOSAL_STATE_PREPROPOSAL);

        // daoStorage().set_endorser(_proposalId, _endorser);
        // daoStorage().set_proposal_state(_proposalId, PROPOSAL_STATE_INITIAL);
        require(daoStorage().updateProposalEndorse(_proposalId, _endorser));
    }

    function voteOnDraft(
        bytes32 _proposalId,
        bytes32 _version_hash,
        bool _voteYes,
        uint256 _nonce
    )
        public
        if_main_phase()
    {
        address _badgeHolder = msg.sender;
        uint256 _badgeStake = stakeStorage().readUserLockedBadge(_badgeHolder);

        // must stake at least one badge
        require(_badgeStake > 0);

        // _version_hash should be the last version in this proposal
        require(daoStorage().getLastProposalVersion(_proposalId) == _version_hash);

        // _nonce should be greater than the last used nonce by this address
        require(daoStorage().readLastNonce(msg.sender) < _nonce);

        daoStorage().addDraftVote(_proposalId, _badgeHolder, _voteYes, _badgeStake, _nonce);
    }

    function commitVoteOnProposal(
        bytes32 _proposalId,
        bytes32 _commitHash,
        uint256 _nonce
    )
        public
        if_commit_phase(_proposalId)
    {
        // proposal must be in the voting phase
        require(daoStorage().readProposalState(_proposalId) == PROPOSAL_STATE_VETTED);
        // nonce must be greater than last used nonce
        require(daoStorage().readLastNonce(msg.sender) < _nonce);
        // user must be a participant
        require(dao_info_service().isParticipant(msg.sender));

        daoStorage().commitVote(_proposalId, _commitHash, msg.sender, _nonce);
    }

    function revealVoteOnProposal(
        bytes32 _proposalId,
        bool _vote,
        uint256 _salt
    )
        public
        if_reveal_phase(_proposalId)
    {
        // proposal should be in voting phase
        require(daoStorage().readProposalState(_proposalId) == PROPOSAL_STATE_VETTED);
        // user must be a participant
        require(dao_info_service().isParticipant(msg.sender));
        // hash should match with _vote and _salt
        require(keccak256(_vote, _salt) == daoStorage().readCommitVote(_proposalId, msg.sender));

        daoStorage().revealVote(_proposalId, msg.sender, _vote);
    }

    function commitVoteOnInterim(
        bytes32 _proposalId,
        uint8 _index,
        bytes32 _commitHash,
        uint256 _nonce
    )
        public
        if_interim_commit_phase(_proposalId, _index)
    {

    }

    function revealVoteOnInterim(
        bytes32 _proposalId,
        uint8 _index,
        bool _vote,
        uint256 _salt
    )
        public
        if_interim_reveal_phase(_proposalId, _index)
    {

    }

    function claimDraftVotingResult()
        public
        if_main_phase()
    {

    }
}
