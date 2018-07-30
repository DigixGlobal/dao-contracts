pragma solidity ^0.4.19;

import "./../DaoVotingClaims.sol";

contract MockDaoVotingClaims is DaoVotingClaims {

    function MockDaoVotingClaims(address _resolver) public DaoVotingClaims(_resolver) {}

    function mock_set_timeline_for_next_milestone(
        bytes32 _proposalId,
        uint256 _index,
        uint256 _milestoneDuration,
        uint256 _milestoneStart
    )
        public
    {
        setTimelineForNextMilestone(
            _proposalId,
            _index,
            _milestoneDuration,
            _milestoneStart
        );
    }
}
