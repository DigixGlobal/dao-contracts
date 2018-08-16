pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract DaoUpgradeStorage is ResolverClient, DaoConstants {

    uint256 public startOfFirstQuarter;
    bool public isReplacedByNewDao;
    address public newDaoContract;
    address public newDaoFundingManager;

    function DaoUpgradeStorage(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO_UPGRADABLE, _resolver));
    }

    function setStartOfFirstQuarter(uint256 _start)
        public
    {
        require(sender_is(CONTRACT_DAO));
        startOfFirstQuarter = _start;
    }

    function updateForDaoMigration(address _newDaoFundingManager, address _newDaoContract)
        public
    {
        require(sender_is(CONTRACT_DAO));
        isReplacedByNewDao = true;
        newDaoContract = _newDaoContract;
        newDaoFundingManager = _newDaoFundingManager;
    }
}
