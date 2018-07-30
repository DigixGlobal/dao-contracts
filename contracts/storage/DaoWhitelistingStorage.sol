pragma solidity ^0.4.19;

import "./../common/DaoConstants.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";

contract DaoWhitelistingStorage is ResolverClient, DaoConstants {

    mapping (address => bool) public whitelist;

    function DaoWhitelistingStorage(address _resolver)
        public
    {
        require(init(CONTRACT_STORAGE_DAO_WHITELISTING, _resolver));
    }

    function setWhitelisted(address _contractAddress, bool _isWhitelisted)
        public
        if_sender_is(CONTRACT_DAO_WHITELISTING)
    {
        whitelist[_contractAddress] = _isWhitelisted;
    }
}
