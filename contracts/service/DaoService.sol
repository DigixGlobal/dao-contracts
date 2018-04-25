pragma solidity ^0.4.19;

import "@digix/cacp-contracts/contracts/ResolverClient.sol";
import "./../Dao.sol";

contract DaoService is ResolverClient {
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
    _time = dao().startOfFirstQuarter();
  }
}
