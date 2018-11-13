pragma solidity ^0.4.25;

import "./DaoConstants.sol";
import "../storage/DaoWhitelistingStorage.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";


contract DaoWhitelistingCommon is ResolverClient, DaoConstants {

    function daoWhitelistingStorage()
        internal
        view
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
        view
        returns (bool _isWhitelisted)
    {
        uint size;
        assembly {
            size := extcodesize(_address)
        }
        _isWhitelisted = size == 0 || daoWhitelistingStorage().whitelist(_address);
    }
}
