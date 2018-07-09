pragma solidity ^0.4.23;

import "./DaoConstants.sol";
import "../storage/DaoWhitelistingStorage.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";

contract DaoStorageCommon is ResolverClient, DaoConstants {
    function daoWhitelistingStorage() internal returns (DaoWhitelistingStorage _contract) {
        _contract = DaoWhitelistingStorage(get_contract(CONTRACT_STORAGE_DAO_WHITELISTING));
    }

    function isContract(address _address)
        internal
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
        returns (bool)
    {
        if (isContract(_address)) {
            require(daoWhitelistingStorage().whitelist(_address));
        }
        return true;
    }
}
