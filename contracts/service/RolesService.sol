pragma solidity ^0.4.19;

import "@digix/cacp-contracts/contracts/ResolverClient.sol";
import "./../DaoRoles.sol";

contract RolesService is ResolverClient {
  using DoublyLinkedList for DoublyLinkedList.Address;

  modifier if_founder() {
    require(dao_roles().is_founder(msg.sender));
    _;
  }

  modifier if_prl() {
    require(dao_roles().is_prl(msg.sender));
    _;
  }

  function RolesService(address _resolver) public {
    require(init(CONTRACT_ROLE_SERVICE, _resolver));
  }

  function dao_roles() internal
           returns (DaoRoles _contract)
  {
    _contract = DaoRoles(get_contract(CONTRACT_DAO_ROLES));
  }
}
