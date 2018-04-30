pragma solidity ^0.4.19;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";

library DaoStructs {
  using DoublyLinkedList for DoublyLinkedList.Bytes;

  struct Voting {
    uint256 startTime;
    mapping (address => bytes32) commits;
    mapping (address => bool) yesVotes;
    mapping (address => bool) noVotes;
    uint256 totalYesVotes;
    uint256 totalNoVotes;
    bool prlValid;
  }

  struct ProposalVersion {
    bytes32 docIpfsHash;
    uint256 created;
    Voting draftVoting;
    uint256 milestoneCount;
    uint256[] milestoneDurations;
    uint256[] milestoneFundings;
  }

  struct Proposal {
    bytes32 proposalId;
    address proposer;
    address endorser;
    uint256 currentState;
    uint256 timeCreated;
    DoublyLinkedList.Bytes proposalVersionDocs;
    mapping (bytes32 => ProposalVersion) proposalVersions;
    Voting votingRound;
    mapping (uint256 => Voting) interimRounds;
  }
}
