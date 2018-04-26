pragma solidity ^0.4.19;

import "./storage/DaoDirectoryStorage.sol";
import "./common/IdentityCommon.sol";

contract DaoIdentity is IdentityCommon {

  struct KycDetails {
    bytes32 doc;
    uint256 id_expiration;
  }

  mapping (address => KycDetails) kycInfo;

  function dao_directory_storage()
           returns (DaoDirectoryStorage _contract)
  {
    _contract = DaoDirectoryStorage(get_contract(CONTRACT_DAO_DIRECTORY_STORAGE));
  }

  function DaoIdentity(address _resolver) public {
    require(init(CONTRACT_DAO_IDENTITY, _resolver));
    dao_directory_storage().create_role(ROLES_FOUNDERS, "founders");
    dao_directory_storage().create_role(ROLES_PRLS, "prls");
    dao_directory_storage().create_role(ROLES_KYC_ADMINS, "kycadmins");
    dao_directory_storage().create_group(ROLES_FOUNDERS, "founders_group", "");  // group_id = 2
    dao_directory_storage().create_group(ROLES_PRLS, "prls_group", "");          // group_id = 3
    dao_directory_storage().create_group(ROLES_KYC_ADMINS, "kycadmins_group", "");  // group_id = 4
  }

  function getUserRoleId(address _user)
           returns (uint256 _role_id)
  {
    _role_id = dao_directory_storage().read_user_role_id(_user);
  }

  function addGroupUser(uint256 _group_id, address _user, bytes32 _doc)
           public
           if_root()
  {
    dao_directory_storage().update_add_user_to_group(_group_id, _user, _doc);
  }

  function removeGroupUser(address _user)
           public
           if_root()
  {
    dao_directory_storage().update_remove_group_user(_user);
  }

  function updateKyc(address _user, bytes32 _doc, uint256 _id_expiration)
           if_kyc_admin()
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

  function isKycApproved(address _user)
           returns (bool _approved)
  {
    uint256 _id_expiration;
    (,_id_expiration) = readKycInfo(_user);
    _approved = _id_expiration > now;
  }

}
