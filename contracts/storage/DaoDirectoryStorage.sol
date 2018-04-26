pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "@digix/cdap/contracts/storage/DirectoryStorage.sol";
import "../common/DaoConstants.sol";

contract DaoDirectoryStorage is ResolverClient, DaoConstants, DirectoryStorage {
  function DaoDirectoryStorage(address _resolver)
           public
  {
    require(init(CONTRACT_DAO_DIRECTORY_STORAGE, _resolver));
    require(initialize_directory());
  }

  function create_group(uint256 _role_id, bytes32 _name, bytes32 _document)
           if_sender_is(CONTRACT_DAO_IDENTITY)
           public
           returns (bool _success, uint256 _group_id)
  {
    (_success, _group_id) = internal_create_group(_role_id, _name, _document);
    require(_success);
  }

  function create_role(uint256 _role_id, bytes32 _name)
           if_sender_is(CONTRACT_DAO_IDENTITY)
           public
           returns (bool _success)
  {
    _success = internal_create_role(_role_id, _name);
    require(_success);
  }

  function update_add_user_to_group(uint256 _group_id, address _user, bytes32 _document)
           if_sender_is(CONTRACT_DAO_IDENTITY)
           public
           returns (bool _success)
  {
    _success = internal_update_add_user_to_group(_group_id, _user, _document);
    require(_success);
  }

  function update_remove_group_user(address _user)
           if_sender_is(CONTRACT_DAO_IDENTITY)
           public
           returns (bool _success)
  {
    _success = internal_destroy_group_user(_user);
    require(_success);
  }

}
