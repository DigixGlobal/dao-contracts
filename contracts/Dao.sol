pragma solidity ^0.4.19;

contract Dao {
  struct Proposal {
    struct Voting {
      uint256 start_time;
      mapping (address => bool) yesVotes;
      mapping (address => bool) noVotes;
      uint256 yesVotes;
      uint256 noVotes;
    }

    struct ProposalVersion {
      bytes32 doc;
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

    ProposalVersion[] allProposalVersions;

    address proposer;
    KycInfo proposerKyc;

    address endorser;
    Voting votingRound;
    Voting[] interimRounds;
    uint256 currentState;
    uint256 timeCreated;

    uint256 proposalId;
  }

  Proposal[] allProposals;
  mapping(uint256 => Proposal) proposalsById;
  mapping(uint256 => Proposal[]) proposalsByState;
  uint256 start_of_first_quarter;
}
