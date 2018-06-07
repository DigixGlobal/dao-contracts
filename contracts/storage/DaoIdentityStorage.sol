pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "@digix/cdap/contracts/storage/DirectoryStorage.sol";
import "../common/DaoConstants.sol";

contract DaoIdentityStorage is ResolverClient, DaoConstants, DirectoryStorage {
    struct KycDetails {
        bytes32 doc;
        uint256 id_expiration;
    }

    mapping (address => KycDetails) kycInfo;

    function DaoIdentityStorage(address _resolver)
        public
    {
        require(init(CONTRACT_STORAGE_DAO_IDENTITY, _resolver));
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

    function update_kyc(address _user, bytes32 _doc, uint256 _id_expiration)
        if_sender_is(CONTRACT_DAO_IDENTITY)
        public
    {
        kycInfo[_user].doc = _doc;
        kycInfo[_user].id_expiration = _id_expiration;
    }

    function read_kyc_info(address _user)
        public
        constant
        returns (bytes32 _doc, uint256 _id_expiration)
    {
        _doc = kycInfo[_user].doc;
        _id_expiration = kycInfo[_user].id_expiration;
    }

    function is_kyc_approved(address _user)
        public
        returns (bool _approved)
    {
        uint256 _id_expiration;
        (,_id_expiration) = read_kyc_info(_user);
        _approved = _id_expiration > now;
    }
}
