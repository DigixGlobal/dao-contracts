pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../Dao.sol";
import "./../common/DaoConstants.sol";

contract DaoService is ResolverClient, DaoConstants {
  function DaoService(address _resolver)
           public
  {
    require(init(CONTRACT_DAO_SERVICE, _resolver));
  }

  function dao()
           internal
           constant
           returns (Dao _contract)
  {
    _contract = Dao(get_contract(CONTRACT_DAO));
  }

  function getDaoStartTime()
           public
           constant
           returns (uint256 _time)
  {
    _time = dao().start_of_first_quarter();
  }

  function getCurrentQuarter()
           public
           constant
           returns (uint256 _quarterId)
  {
    _quarterId = (now - dao().start_of_first_quarter()) / (90 days);
  }
}
