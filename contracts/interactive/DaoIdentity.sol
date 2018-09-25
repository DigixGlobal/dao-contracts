pragma solidity ^0.4.24;

import "../storage/DaoIdentityStorage.sol";
import "../common/IdentityCommon.sol";


/**
@title Contract to manage the admin roles in DAO (founders, prls, kyc admins)
@author Digix Holdings
*/
contract DaoIdentity is IdentityCommon {

    /**
    @notice Constructor (create initial roles, groups)
    @param _resolver Address of Contract Resolver
    */
    constructor(address _resolver)
        public
    {
        require(init(CONTRACT_DAO_IDENTITY, _resolver));
        // create the three roles and the three corresponding groups
        // the root role, and root group are already created, with only the contract deployer in it
        // After deployment, the contract deployer will call addGroupUser to add a multi-sig to be another root
        // The multi-sig will then call removeGroupUser to remove the contract deployer from root role
        // From then on, the multi-sig will be the only root account
        identity_storage().create_role(ROLES_FOUNDERS, "founders");
        identity_storage().create_role(ROLES_PRLS, "prls");
        identity_storage().create_role(ROLES_KYC_ADMINS, "kycadmins");
        identity_storage().create_group(ROLES_FOUNDERS, "founders_group", ""); // group_id = 2
        identity_storage().create_group(ROLES_PRLS, "prls_group", ""); // group_id = 3
        identity_storage().create_group(ROLES_KYC_ADMINS, "kycadmins_group", ""); // group_id = 4
    }

    /**
    @notice Function to add an address to a group (only root can call this function)
    @param _group_id ID of the group to be added in
    @param _user Ethereum address of the user
    @param _doc hash of IPFS doc containing details of this user
    */
    function addGroupUser(uint256 _group_id, address _user, bytes32 _doc)
        public
        if_root()
    {
        identity_storage().update_add_user_to_group(_group_id, _user, _doc);
    }

    /**
    @notice Function to remove a user from group (only root can call this)
    @param _user Ethereum address of the user to be removed from their group
    */
    function removeGroupUser(address _user)
        public
        if_root()
    {
        identity_storage().update_remove_group_user(_user);
    }

    /**
    @notice Function to update the KYC data of user (expiry data of valid KYC) (can only be called by the KYC ADMIN role)
    @param _user Ethereum address of the user
    @param _doc hash of the IPFS doc containing kyc information about this user
    @param _id_expiration expiry date of the KYC
    */
    function updateKyc(address _user, bytes32 _doc, uint256 _id_expiration)
        public
        if_kyc_admin()
    {
        identity_storage().update_kyc(_user, _doc, _id_expiration);
    }
}
