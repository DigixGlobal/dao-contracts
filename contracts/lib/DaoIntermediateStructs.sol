pragma solidity ^0.4.23;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";

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
}
