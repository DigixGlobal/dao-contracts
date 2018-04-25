pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";

contract Dao is ResolverClient, DaoConstants {
  using DoublyLinkedList for DoublyLinkedList.Bytes;

  struct Voting {
    uint256 start_time;
    mapping (address => bool) yesVotes;
    mapping (address => bool) noVotes;
    uint256 yesVotes;
    uint256 noVotes;
  }

  struct ProposalVersion {
    bytes32 doc_ipfs_hash;
    uint256 created;
    Voting draftVoting;
    uint256 milestoneCount;
    uint256[] milestoneDurations;
    uint256[] milestoneFundings;
  }

  struct KycInfo {
    bytes32 doc;
    uint256 id_expiration;
  }

  struct Proposal {

    ProposalVersion[] allProposalVersions;

    address proposer;
    KycInfo proposerKyc;

    address endorser;
    Voting votingRound;
    Voting[] interimRounds;
    uint256 currentState;
    uint256 timeCreated;

    // this will always be the doc_ipfs_hash of the last proposal version
    bytes32 proposalId;
  }

  DoublyLinkedList.Bytes allProposals;

  mapping(bytes32 => Proposal) proposalsById;
  mapping(bytes32 => DoublyLinkedList.Bytes) proposalsByState;

  uint256 start_of_first_quarter;

  function Dao(address _resolver) public {
    require(init(CONTRACT_DAO, _resolver));
  }

}
