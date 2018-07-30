pragma solidity ^0.4.23;

library DaoIntermediateStructs {

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
        uint256 milestoneStart;
    }

    struct Users {
        address[] users;
        uint256 usersLength;
    }

    struct CountIntermediaryStruct {
        address countedUntil;
        uint256 forCount;
        uint256 againstCount;
    }
}
