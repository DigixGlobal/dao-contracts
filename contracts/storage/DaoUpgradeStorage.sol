pragma solidity ^0.4.24;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract DaoUpgradeStorage is ResolverClient, DaoConstants {

    // this UTC timestamp marks the start of the first quarter
    // of DigixDAO. All time related calculations in DaoCommon
    // depend on this value
    uint256 public startOfFirstQuarter;

    // this boolean marks whether the DAO contracts have been replaced
    // by newer versions or not. The process of migration is done by deploying
    // a new set of contracts, transferring funds from these contracts to the new ones
    // migrating some state variables, and finally setting this boolean to true
    // All operations in these contracts that may transfer tokens, claim ether,
    // boost one's reputation, etc. SHOULD fail if this is true
    bool public isReplacedByNewDao;

    // this is the address of the new Dao contract
    address public newDaoContract;

    // this is the address of the new DaoFundingManager contract
    // ether funds will be moved from the current version's contract to this
    // new contract
    address public newDaoFundingManager;

    // this is the address of the new DaoRewardsManager contract
    // DGX funds will be moved from the current version of contract to this
    // new contract
    address public newDaoRewardsManager;

    constructor(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO_UPGRADE, _resolver));
    }

    function setStartOfFirstQuarter(uint256 _start)
        public
    {
        require(sender_is(CONTRACT_DAO));
        startOfFirstQuarter = _start;
    }

    
    function setNewContractAddresses(
        address _newDaoContract,
        address _newDaoFundingManager,
        address _newDaoRewardsManager
    )
        public
    {
        require(sender_is(CONTRACT_DAO));
        newDaoContract = _newDaoContract;
        newDaoFundingManager = _newDaoFundingManager;
        newDaoRewardsManager = _newDaoRewardsManager;
    }

    
    function updateForDaoMigration()
        public
    {
        require(sender_is(CONTRACT_DAO));
        isReplacedByNewDao = true;
    }
}
