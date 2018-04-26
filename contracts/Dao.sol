pragma solidity ^0.4.19;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "./common/DaoCommon.sol";

contract Dao is DaoCommon {

  function Dao(address _resolver) public {
    require(init(CONTRACT_DAO, _resolver));
  }


}
