pragma solidity ^0.4.23;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";
import "../lib/DaoStructs.sol";

contract DaoSpecialStorage is ResolverClient, DaoConstants {
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
        DaoStructs.Voting storage _voting = proposalsById[_proposalId].voting;
        uint256 _n = _allUsers.length;
        for (uint256 i = 0; i < _n; i++) {
            if (_voting.yesVotes[_allUsers[i]] > 0) {
                _for += _voting.yesVotes[_allUsers[i]];
            } else if (_voting.noVotes[_allUsers[i]] > 0) {
                _against += _voting.noVotes[_allUsers[i]];
            }
        }
        _quorum = _for + _against;
    }

    function readVotingTime(bytes32 _proposalId)
        public
        constant
        returns (uint256 _start)
    {
        _start = proposalsById[_proposalId].voting.startTime;
    }

    function commitVote(
        bytes32 _proposalId,
        bytes32 _hash,
        address _voter
    )
        public
        if_sender_is(CONTRACT_DAO_VOTING)
        returns (bool _success)
    {
        DaoStructs.SpecialProposal _proposal = proposalsById[_proposalId];
        _proposal.voting.commits[_voter] = _hash;
        _success = true;
    }

    function readCommitVote(bytes32 _proposalId, address _voter)
        public
        constant
        returns (bytes32 _commitHash)
    {
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
        _result = proposalsById[_proposalId].voting.passed;
    }

    function setPass(bytes32 _proposalId, bool _result)
        public
        if_sender_is(CONTRACT_DAO_VOTING_CLAIMS)
        returns (bool _success)
    {
        proposalsById[_proposalId].voting.passed = _result;
        _success = true;
    }

    function setVotingClaim(bytes32 _proposalId, bool _claimed)
        public
        if_sender_is(CONTRACT_DAO_VOTING_CLAIMS)
    {
        DaoStructs.SpecialProposal _proposal = proposalsById[_proposalId];
        _proposal.voting.claimed = _claimed;
    }

    function isClaimed(bytes32 _proposalId)
        public
        returns (bool _claimed)
    {
        _claimed = proposalsById[_proposalId].voting.claimed;
    }

    function readVote(bytes32 _proposalId, address _voter)
        public
        constant
        returns (bool _vote, uint256 _weight)
    {
        DaoStructs.Voting _voting = proposalsById[_proposalId].voting;
        if (_voting.yesVotes[_voter] > 0) {
            _weight = _voting.yesVotes[_voter];
            _vote = true;
        } else {
            _weight = _voting.noVotes[_voter];
            _vote = false;
        }
    }

    function revealVote(
        bytes32 _proposalId,
        address _voter,
        bool _vote,
        uint256 _weight
    )
        public
        if_sender_is(CONTRACT_DAO_VOTING)
        returns (bool _success)
    {
        DaoStructs.Voting _voting = proposalsById[_proposalId].voting;
        if (_vote) {
            _voting.yesVotes[_voter] = _weight;
        } else {
            _voting.noVotes[_voter] = _weight;
        }
        _success = true;
    }
}
