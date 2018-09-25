pragma solidity ^0.4.24;

import "../../storage/DaoUpgradeStorage.sol";

contract MockDaoUpgradeStorage is DaoUpgradeStorage {

    constructor(address _resolver) public DaoUpgradeStorage(_resolver) {}

    function mock_set_start_of_quarter(uint256 _startOfFirstQuarter)
        public
    {
        startOfFirstQuarter = _startOfFirstQuarter;
    }
}
