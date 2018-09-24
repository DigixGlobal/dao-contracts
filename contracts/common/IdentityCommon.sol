pragma solidity ^0.4.24;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../storage/DaoIdentityStorage.sol";
import "./DaoConstants.sol";

contract IdentityCommon is ResolverClient, DaoConstants {

  modifier if_root() {
    require(identity_storage().read_user_role_id(msg.sender) == ROLES_ROOT);
    _;
  }

  modifier if_founder() {
    require(is_founder());
    _;
  }

  function is_founder()
      internal
      constant
      returns (bool _isFounder)
  {
      _isFounder = identity_storage().read_user_role_id(msg.sender) == ROLES_FOUNDERS;
  }

  modifier if_prl() {
    require(identity_storage().read_user_role_id(msg.sender) == ROLES_PRLS);
    _;
  }

  modifier if_kyc_admin() {
    require(identity_storage().read_user_role_id(msg.sender) == ROLES_KYC_ADMINS);
    _;
  }

  function identity_storage()
    internal
    constant
    returns (DaoIdentityStorage _contract)
  {
    _contract = DaoIdentityStorage(get_contract(CONTRACT_STORAGE_DAO_IDENTITY));
  }
}
