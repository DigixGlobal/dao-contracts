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
      if_sender_is(CONTRACT_DAO)
      public
  {
      require(startOfFirstQuarter == 0);
      startOfFirstQuarter = _start;
  }

  function updateForDaoMigration(address _newDaoFundingManager, address _newDaoContract)
      if_sender_is(CONTRACT_DAO)
      public
  {
    isReplacedByNewDao = true;
    newDaoContract = _newDaoContract;
    newDaoFundingManager = _newDaoFundingManager;
  }
}
