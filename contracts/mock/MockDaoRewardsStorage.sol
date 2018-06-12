pragma solidity^0.4.19;

import "./../storage/DaoRewardsStorage.sol";

contract MockDaoRewardsStorage is DaoRewardsStorage {
    function MockDaoRewardsStorage(address _resolver) public DaoRewardsStorage(_resolver) {}

    function mock_set_last_participated_quarter(address _user, uint256 _quarterIndex)
        public
    {
        lastParticipatedQuarter[_user] = _quarterIndex;
    }

    function mock_set_last_quarter_that_rewards_was_updated(address _user, uint256 _quarterIndex)
        public
    {
        lastQuarterThatRewardsWasUpdated[_user] = _quarterIndex;
    }
}
