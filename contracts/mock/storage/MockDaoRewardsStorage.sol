pragma solidity ^0.4.25;

import "../../storage/DaoRewardsStorage.sol";

contract MockDaoRewardsStorage is DaoRewardsStorage {

    constructor(address _resolver) public DaoRewardsStorage(_resolver) {}

    function mock_set_last_participated_quarter(address _user, uint256 _quarterNumber)
        public
    {
        lastParticipatedQuarter[_user] = _quarterNumber;
    }

    function mock_bulk_set_last_participated_quarter(address[] _users, uint256 _quarterNumber)
        public
    {
        uint256 _n = _users.length;
        for (uint256 i = 0; i < _n; i++) {
            lastParticipatedQuarter[_users[i]] = _quarterNumber;
        }
    }

    function mock_set_last_quarter_that_rewards_was_updated(address _user, uint256 _quarterNumber)
        public
    {
        lastQuarterThatRewardsWasUpdated[_user] = _quarterNumber;
    }

    function mock_set_dgx_distribution_day(uint256 _quarterNumber, uint256 _dgxDistributionDay)
        public
    {
        allQuartersInfo[_quarterNumber].dgxDistributionDay = _dgxDistributionDay;
    }
}
