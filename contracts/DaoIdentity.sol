pragma solidity ^0.4.19;

import "./storage/DaoIdentityStorage.sol";
import "./common/IdentityCommon.sol";

contract DaoIdentity is IdentityCommon {
    function DaoIdentity(address _resolver)
        public
    {
        require(init(CONTRACT_DAO_IDENTITY, _resolver));
        identity_storage().create_role(ROLES_FOUNDERS, "founders");
        identity_storage().create_role(ROLES_PRLS, "prls");
        identity_storage().create_role(ROLES_KYC_ADMINS, "kycadmins");
        identity_storage().create_group(ROLES_FOUNDERS, "founders_group", ""); // group_id = 2
        identity_storage().create_group(ROLES_PRLS, "prls_group", ""); // group_id = 3
        identity_storage().create_group(ROLES_KYC_ADMINS, "kycadmins_group", ""); // group_id = 4
    }

    function addGroupUser(uint256 _group_id, address _user, bytes32 _doc)
        public
        if_root()
    {
        identity_storage().update_add_user_to_group(_group_id, _user, _doc);
    }

    function removeGroupUser(address _user)
        public
        if_root()
    {
        identity_storage().update_remove_group_user(_user);
    }

    function updateKyc(address _user, bytes32 _doc, uint256 _id_expiration)
        public
        if_kyc_admin()
    {
        identity_storage().update_kyc(_user, _doc, _id_expiration);
    }
}
