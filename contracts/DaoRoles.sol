pragma solidity ^0.4.19;

import "@digix/cacp-contracts/contracts/ResolverClient.sol";
import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";

contract DaoRoles is ResolverClient, RolesService {
  using DoublyLinkedList for DoublyLinkedList.Address;

  DoublyLinkedList.Address founders;
  mapping public (address => bool) is_founder;

  DoublyLinkedList.Address prls;
  mapping public (address => bool) is_prl;

  function DaoRoles(address _resolver) public {
    require(init(CONTRACT_DAO_ROLES, _resolver));
  }

  function addFounder(address _new_founder)
           if_owner
  {
    founders.append(_new_founder);
    is_founder[_new_founder] = true;
  }

  function removeFounder(address _founder)
           if_owner
  {
    founders.remove_item(founder);
    is_founder[_founder] = false;
  }

  function addPrl(address _new_prl)
           if_founder
  {
    prls.append(_new_prl);
    is_prl[_new_prl] = true;
  }

  function removePrl(address _prl)
           if_founder
  {
    prls.remove_item(prl);
    is_prl[_founder] = false;
  }

}
