pragma solidity ^0.4.24;

import "./../common/DaoConstants.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";

// This contract is basically created to restrict read access to
// ethereum accounts, and whitelisted contracts
contract DaoWhitelistingStorage is ResolverClient, DaoConstants {

    // we want to avoid the scenario in which an on-chain bribing contract
    // can be deployed to distribute funds in a trustless way by verifying
    // on-chain votes. This mapping marks whether a contract address is whitelisted
    // to read from the read functions in DaoStorage, DaoSpecialStorage, etc.
    mapping (address => bool) public whitelist;

    constructor(address _resolver)
        public
    {
        require(init(CONTRACT_STORAGE_DAO_WHITELISTING, _resolver));
    }

    function setWhitelisted(address _contractAddress, bool _isWhitelisted)
        public
    {
        require(sender_is(CONTRACT_DAO_WHITELISTING));
        whitelist[_contractAddress] = _isWhitelisted;
    }
}
