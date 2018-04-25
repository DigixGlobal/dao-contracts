pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "./service/RolesService.sol";
import "zeppelin-solidity/contracts/ownership/Claimable.sol";

contract DaoIdentity is ResolverClient, RolesService, Claimable {
  using DoublyLinkedList for DoublyLinkedList.Address;

  struct KycInfo {
    bytes32 doc;
    uint256 id_expiration;
  }

  mapping (address => KycInfo) kycInfo;

  DoublyLinkedList.Address founders;
  mapping (address => bool) public is_founder;

  DoublyLinkedList.Address prls;
  mapping (address => bool) public is_prl;

  function DaoIdentity(address _resolver) public {
    require(init(CONTRACT_DAO_ROLES, _resolver));
  }

  function addFounder(address _new_founder)
           public
           onlyOwner()
  {
    founders.append(_new_founder);
    is_founder[_new_founder] = true;
  }

  function removeFounder(address _founder)
           public
           onlyOwner()
  {
    founders.remove_item(_founder);
    is_founder[_founder] = false;
  }

  function addPrl(address _new_prl)
           public
           if_founder()
  {
    prls.append(_new_prl);
    is_prl[_new_prl] = true;
  }

  function removePrl(address _prl)
           public
           if_founder()
  {
    prls.remove_item(_prl);
    is_prl[_prl] = false;
  }

  function updateKyc(address _user, bytes32 _doc, uint256 _id_expiration)
           if_prl()
  {
    kycInfo[_user].doc = _doc;
    kycInfo[_user].id_expiration = _id_expiration;
  }

  function readKycInfo(address _user)
           returns (bytes32 _doc, uint256 _id_expiration)
  {
    _doc = kycInfo[_user].doc;
    _id_expiration = kycInfo[_user].id_expiration;
  }
  
}
