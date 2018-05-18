pragma solidity ^0.4.23;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";

library DaoStructs {
  using DoublyLinkedList for DoublyLinkedList.Bytes;

  struct VotingCount {
    uint256 forCount;
    uint256 againstCount;
    uint256 quorum;
  }

  struct Voting {
    uint256 startTime;
    mapping (bytes32 => bool) usedCommits;
    mapping (address => bytes32) commits;
    mapping (address => uint256) yesVotes;
    mapping (address => uint256) noVotes;
    uint256 totalYesVotes;
    uint256 totalNoVotes;
    bool passed;
    address claimer;
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
    bool prlValid;
  }
}
