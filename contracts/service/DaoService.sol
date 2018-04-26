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
           returns (Dao _contract)
  {
    _contract = Dao(get_contract(CONTRACT_DAO));
  }

  function getDaoStartTime()
           public
           returns (uint256 _time)
  {
    _time = dao().start_of_first_quarter();
  }
}
