pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "./../DaoIdentity.sol";
import "./../DaoConstants.sol";

contract RolesService is ResolverClient, DaoConstants {
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
           returns (DaoIdentity _contract)
  {
    _contract = DaoIdentity(get_contract(CONTRACT_DAO_ROLES));
  }
}
