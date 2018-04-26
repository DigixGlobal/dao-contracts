pragma solidity ^0.4.19;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoCommon.sol";
import "../common/DaoConstants.sol";

contract DaoStorage is ResolverClient, DaoConstants {
  using DoublyLinkedList for DoublyLinkedList.Bytes;

  struct Voting {
    uint256 start_time;
    mapping (address => bool) yesVotes;
    mapping (address => bool) noVotes;
    uint256 totalYesVotes;
    uint256 totalNoVotes;
  }

  struct ProposalVersion {
    bytes32 doc_ipfs_hash;
    uint256 created;
    Voting draftVoting;
    uint256 milestoneCount;
    uint256[] milestoneDurations;
    uint256[] milestoneFundings;
  }

  struct Proposal {
    ProposalVersion[] allProposalVersions;
    address proposer;

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
  uint256 public start_of_first_quarter;

  function DaoStorage(address _resolver) public {
    require(init(CONTRACT_DAO_STORAGE, _resolver));
  }

}
