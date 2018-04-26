pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../storage/DaoStorage.sol";
import "./../common/DaoConstants.sol";

contract DaoInfoService is ResolverClient, DaoConstants {
  function DaoInfoService(address _resolver)
           public
  {
    require(init(CONTRACT_DAO_INFO_SERVICE, _resolver));
  }

  function dao_storage()
           internal
           returns (DaoStorage _contract)
  {
    _contract = DaoStorage(get_contract(CONTRACT_DAO));
  }

  function getDaoStartTime()
           public
           returns (uint256 _time)
  {
    _time = dao_storage().start_of_first_quarter();
  }

  function getCurrentQuarter()
           public
           constant
           returns (uint256 _quarterId)
  {
    _quarterId = (now - dao_storage().start_of_first_quarter()) / (90 days);
  }
}
