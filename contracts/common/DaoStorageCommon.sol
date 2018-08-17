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

    function isContract(address _address)
        internal
        constant
        returns (bool)
    {
        uint size;
        assembly {
            size := extcodesize(_address)
        }
        if (size > 0) {
            return true;
        }
        return false;
    }

    function isWhitelisted(address _address)
        internal
        constant
        returns (bool)
    {
        if (isContract(_address)) {
            require(daoWhitelistingStorage().whitelist(_address));
        }
        return true;
    }
}
