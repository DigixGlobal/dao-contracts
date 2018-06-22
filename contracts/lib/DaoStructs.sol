pragma solidity ^0.4.23;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";

library DaoStructs {
    using DoublyLinkedList for DoublyLinkedList.Bytes;

    struct VotingCount {
        uint256 forCount;
        uint256 againstCount;
        uint256 quorum;
    }

    struct MilestoneInfo {
        uint256 index;
        uint256 duration;
        uint256 funding;
        uint256 finalReward;
    }

    struct Users {
        address[] users;
        uint256 usersLength;
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
        /* address claimer; */
        bool claimed;
        bool prlValid;
    }

    struct ProposalVersion {
        bytes32 docIpfsHash;
        uint256 created;
        /* Voting draftVoting; */
        uint256 milestoneCount;
        uint256[] milestoneDurations;
        uint256[] milestoneFundings;
        uint256 finalReward;
    }

    struct Proposal {
        bytes32 proposalId;
        address proposer;
        address endorser;
        uint256 currentState;
        uint256 timeCreated;
        DoublyLinkedList.Bytes proposalVersionDocs;
        mapping (bytes32 => ProposalVersion) proposalVersions;
        Voting draftVoting;
        Voting votingRound;
        mapping (uint256 => Voting) interimRounds;
        /* bool prlValid; */
        bytes32 finalVersion;
    }

    struct SpecialProposal {
        bytes32 proposalId;
        address proposer;
        uint256 timeCreated;
        Voting voting;
        uint256[] uintConfigs;
        address[] addressConfigs;
        bytes32[] bytesConfigs;
    }

    struct DaoQuarterInfo {
        uint256 minimalParticipationPoint;
        uint256 quarterPointScalingFactor;
        uint256 reputationPointScalingFactor;
        uint256 totalEffectiveDGDLastQuarter;

        uint256 badgeMinimalParticipationPoint;
        uint256 badgeQuarterPointScalingFactor;
        uint256 badgeReputationPointScalingFactor;
        uint256 totalEffectiveBadgeLastQuarter;

        uint256 dgxDistributionDay; // the timestamp when DGX rewards is distributable to Holders
        uint256 dgxRewardsPoolLastQuarter;
        uint256 sumRewardsFromBeginning;
        mapping (address => uint256) reputationPoint;
    }
}
