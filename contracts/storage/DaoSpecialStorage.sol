pragma solidity ^0.4.23;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "../common/DaoStorageCommon.sol";
import "../lib/DaoStructs.sol";
import "./DaoWhitelistingStorage.sol";

contract DaoSpecialStorage is DaoStorageCommon {
    using DoublyLinkedList for DoublyLinkedList.Bytes;
    using DaoStructs for DaoStructs.SpecialProposal;
    using DaoStructs for DaoStructs.Voting;

    DoublyLinkedList.Bytes proposals;
    mapping (bytes32 => DaoStructs.SpecialProposal) proposalsById;

    function DaoSpecialStorage(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO_SPECIAL, _resolver));
    }

    function addSpecialProposal(
        bytes32 _proposalId,
        address _proposer,
        uint256[] _uintConfigs,
        address[] _addressConfigs,
        bytes32[] _bytesConfigs
    )
        public
        if_sender_is(CONTRACT_DAO)
    {
        proposals.append(_proposalId);
        proposalsById[_proposalId].proposalId = _proposalId;
        proposalsById[_proposalId].proposer = _proposer;
        proposalsById[_proposalId].timeCreated = now;
        proposalsById[_proposalId].uintConfigs = _uintConfigs;
        proposalsById[_proposalId].addressConfigs = _addressConfigs;
        proposalsById[_proposalId].bytesConfigs = _bytesConfigs;
    }

    function readProposal(bytes32 _proposalId)
        public
        returns (
            bytes32 _id,
            address _proposer,
            uint256 _timeCreated,
            uint256 _timeVotingStarted
        )
    {
        _id = proposalsById[_proposalId].proposalId;
        _proposer = proposalsById[_proposalId].proposer;
        _timeCreated = proposalsById[_proposalId].timeCreated;
        _timeVotingStarted = proposalsById[_proposalId].voting.startTime;
    }

    function readProposalProposer(bytes32 _proposalId)
        public
        returns (address _proposer)
    {
        _proposer = proposalsById[_proposalId].proposer;
    }

    function readConfigs(bytes32 _proposalId)
        public
        returns (
            uint256[] memory _uintConfigs,
            address[] memory _addressConfigs,
            bytes32[] memory _bytesConfigs
        )
    {
        _uintConfigs = proposalsById[_proposalId].uintConfigs;
        _addressConfigs = proposalsById[_proposalId].addressConfigs;
        _bytesConfigs = proposalsById[_proposalId].bytesConfigs;
    }

    function readVotingCount(bytes32 _proposalId, address[] _allUsers)
        public
        constant
        returns (uint256 _for, uint256 _against, uint256 _quorum)
    {
        require(isWhitelisted(msg.sender));
        return proposalsById[_proposalId].voting.countVotes(_allUsers);
    }

    function readVotingTime(bytes32 _proposalId)
        public
        constant
        returns (uint256 _start)
    {
        require(isWhitelisted(msg.sender));
        _start = proposalsById[_proposalId].voting.startTime;
    }

    function commitVote(
        bytes32 _proposalId,
        bytes32 _hash,
        address _voter
    )
        public
        if_sender_is(CONTRACT_DAO_VOTING)
    {
        proposalsById[_proposalId].voting.commits[_voter] = _hash;
    }

    function readCommitVote(bytes32 _proposalId, address _voter)
        public
        constant
        returns (bytes32 _commitHash)
    {
        require(isWhitelisted(msg.sender));
        _commitHash = proposalsById[_proposalId].voting.commits[_voter];
    }

    function setVotingTime(bytes32 _proposalId, uint256 _time)
        public
        if_sender_is(CONTRACT_DAO)
    {
        proposalsById[_proposalId].voting.startTime = _time;
    }

    function readVotingResult(bytes32 _proposalId)
        public
        returns (bool _result)
    {
        require(isWhitelisted(msg.sender));
        _result = proposalsById[_proposalId].voting.passed;
    }

    function setPass(bytes32 _proposalId, bool _result)
        public
        if_sender_is(CONTRACT_DAO_SPECIAL_VOTING_CLAIMS)
    {
        proposalsById[_proposalId].voting.passed = _result;
    }

    function setVotingClaim(bytes32 _proposalId, bool _claimed)
        public
        if_sender_is(CONTRACT_DAO_SPECIAL_VOTING_CLAIMS)
    {
        DaoStructs.SpecialProposal _proposal = proposalsById[_proposalId];
        _proposal.voting.claimed = _claimed;
    }

    function isClaimed(bytes32 _proposalId)
        public
        returns (bool _claimed)
    {
        require(isWhitelisted(msg.sender));
        _claimed = proposalsById[_proposalId].voting.claimed;
    }

    function readVote(bytes32 _proposalId, address _voter)
        public
        constant
        returns (bool _vote, uint256 _weight)
    {
        require(isWhitelisted(msg.sender));
        return proposalsById[_proposalId].voting.readVote(_voter);
    }

    function revealVote(
        bytes32 _proposalId,
        address _voter,
        bool _vote,
        uint256 _weight
    )
        public
        if_sender_is(CONTRACT_DAO_VOTING)
    {
        proposalsById[_proposalId].voting.revealVote(_voter, _vote, _weight);
    }
}
