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
  mapping (address => uint256) lastNonce;

  function DaoSpecialStorage(address _resolver) public {
      require(init(CONTRACT_DAO_SPECIAL_STORAGE, _resolver));
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
    proposalsById[_proposalId].voting.startTime = now;
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
      if (_voting.yesVotes[_allUsers[i]] > 0)
      {
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

  function readLastNonce(address _voter)
    public
    constant
    returns (uint256 _lastNonce)
  {
    _lastNonce = lastNonce[_voter];
  }

  function commitVote(
    bytes32 _proposalId,
    bytes32 _hash,
    address _voter,
    uint256 _nonce
  )
    public
    if_sender_is(CONTRACT_DAO)
    returns (bool _success)
  {
    DaoStructs.SpecialProposal _proposal = proposalsById[_proposalId];
    lastNonce[_voter] = _nonce;
    _proposal.voting.commits[_voter] = _hash;
    _proposal.voting.usedCommits[_hash] = true;
    _success = true;
  }

  function isCommitUsed(bytes32 _proposalId, bytes32 _commit)
    public
    constant
    returns (bool _used)
  {
    _used = proposalsById[_proposalId].voting.usedCommits[_commit];
  }

  function readCommitVote(bytes32 _proposalId, address _voter)
    public
    constant
    returns (bytes32 _commitHash)
  {
    _commitHash = proposalsById[_proposalId].voting.commits[_voter];
  }

  function setPass(bytes32 _proposalId, bool _result)
    public
    if_sender_is(CONTRACT_DAO)
    returns (bool _success)
  {
    proposalsById[_proposalId].voting.passed = _result;
    _success = true;
  }

  function setVotingClaim(bytes32 _proposalId, address _claimer)
    public
    if_sender_is(CONTRACT_DAO)
  {
    DaoStructs.SpecialProposal _proposal = proposalsById[_proposalId];
    _proposal.voting.claimer = _claimer;
  }

  function getClaimer(bytes32 _proposalId)
    public
    returns (address _claimer)
  {
    _claimer = proposalsById[_proposalId].voting.claimer;
  }

  function readVote(bytes32 _proposalId, address _voter)
    public
    constant
    returns (uint256 _weight)
  {
    DaoStructs.Voting _voting = proposalsById[_proposalId].voting;
    if (_voting.yesVotes[_voter] > 0) {
      _weight = _voting.yesVotes[_voter];
    } else {
      _weight = _voting.noVotes[_voter];
    }
  }

  function revealVote(
    bytes32 _proposalId,
    address _voter,
    bool _vote,
    uint256 _weight
  )
    public
    if_sender_is(CONTRACT_DAO)
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
