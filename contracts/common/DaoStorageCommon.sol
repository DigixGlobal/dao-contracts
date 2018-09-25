pragma solidity ^0.4.24;

import "./DaoConstants.sol";
import "../storage/DaoWhitelistingStorage.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";


contract DaoStorageCommon is ResolverClient, DaoConstants {

    function daoWhitelistingStorage()
        internal
        constant
        returns (DaoWhitelistingStorage _contract)
    {
        _contract = DaoWhitelistingStorage(get_contract(CONTRACT_STORAGE_DAO_WHITELISTING));
    }

    /**
    @notice Check if a certain address is whitelisted to read sensitive information in the storage layer
    @dev if the address is an account, it is allowed to read. If the address is a contract, it has to be in the whitelist
    */
    function isWhitelisted(address _address)
        internal
        constant
        returns (bool _isWhitelisted)
    {
        uint size;
        assembly {
            size := extcodesize(_address)
        }
        _isWhitelisted = size == 0 || daoWhitelistingStorage().whitelist(_address);
    }
}
