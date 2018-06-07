pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../storage/DaoIdentityStorage.sol";
import "./DaoConstants.sol";

contract IdentityCommon is ResolverClient, DaoConstants {

  modifier if_root() {
    require(identity_storage().read_user_role_id(msg.sender) == ROLES_ROOT);
    _;
  }

  modifier if_founder() {
    require(identity_storage().read_user_role_id(msg.sender) == ROLES_FOUNDERS);
    _;
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
