pragma solidity ^0.4.25;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "@digix/cdap/contracts/storage/DirectoryStorage.sol";
import "../common/DaoConstants.sol";

contract DaoIdentityStorage is ResolverClient, DaoConstants, DirectoryStorage {

    // struct for KYC details
    // doc is the IPFS doc hash for any information regarding this KYC
    // id_expiration is the UTC timestamp at which this KYC will expire
    // at any time after this, the user's KYC is invalid, and that user
    // MUST re-KYC before doing any proposer related operation in DigixDAO
    struct KycDetails {
        bytes32 doc;
        uint256 id_expiration;
    }

    // a mapping of address to the KYC details
    mapping (address => KycDetails) kycInfo;

    constructor(address _resolver)
        public
    {
        require(init(CONTRACT_STORAGE_DAO_IDENTITY, _resolver));
        require(initialize_directory());
    }

    function create_group(uint256 _role_id, bytes32 _name, bytes32 _document)
        public
        returns (bool _success, uint256 _group_id)
    {
        require(sender_is(CONTRACT_DAO_IDENTITY));
        (_success, _group_id) = internal_create_group(_role_id, _name, _document);
        require(_success);
    }

    function create_role(uint256 _role_id, bytes32 _name)
        public
        returns (bool _success)
    {
        require(sender_is(CONTRACT_DAO_IDENTITY));
        _success = internal_create_role(_role_id, _name);
        require(_success);
    }

    function update_add_user_to_group(uint256 _group_id, address _user, bytes32 _document)
        public
        returns (bool _success)
    {
        require(sender_is(CONTRACT_DAO_IDENTITY));
        _success = internal_update_add_user_to_group(_group_id, _user, _document);
        require(_success);
    }

    function update_remove_group_user(address _user)
        public
        returns (bool _success)
    {
        require(sender_is(CONTRACT_DAO_IDENTITY));
        _success = internal_destroy_group_user(_user);
        require(_success);
    }

    function update_kyc(address _user, bytes32 _doc, uint256 _id_expiration)
        public
    {
        require(sender_is(CONTRACT_DAO_IDENTITY));
        kycInfo[_user].doc = _doc;
        kycInfo[_user].id_expiration = _id_expiration;
    }

    function read_kyc_info(address _user)
        public
        view
        returns (bytes32 _doc, uint256 _id_expiration)
    {
        _doc = kycInfo[_user].doc;
        _id_expiration = kycInfo[_user].id_expiration;
    }

    function is_kyc_approved(address _user)
        public
        view
        returns (bool _approved)
    {
        uint256 _id_expiration;
        (,_id_expiration) = read_kyc_info(_user);
        _approved = _id_expiration > now;
    }
}
