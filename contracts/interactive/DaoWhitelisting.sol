pragma solidity ^0.4.25;

import "../common/DaoConstants.sol";
import "../common/DaoCommon.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";


/**
@title Interactive DAO contract for whitelisting/blacklisting contracts from reading from Storage layer contracts
@author Digix Holdings
*/
contract DaoWhitelisting is ResolverClient, DaoConstants, DaoCommon {

    /**
    @notice Constructor
    @dev Pass in the DigixDAO interactive contract addresses, that can read votes
    @param _resolver Address of ContractResolver contract
    @param _initialWhitelist Array of addresses, initially whitelisted contracts
    */
    constructor(address _resolver, address[] _initialWhitelist)
        public
    {
        require(init(CONTRACT_DAO_WHITELISTING, _resolver));

        uint256 _n = _initialWhitelist.length;
        for (uint256 i = 0; i < _n; i++) {
            daoWhitelistingStorage().setWhitelisted(_initialWhitelist[i], true);
        }
    }

    /**
    @notice Function to whitelist a contract address (only callable by PRL)
    @dev Whitelisted contracts can read votes from the DaoStorage contract
    @param _contract Ethereum address of the deployed contract
    @param _senderIsAllowedToRead Boolean, true if to be whitelisted, false to blacklist
    */
    function setWhitelisted(address _contract, bool _senderIsAllowedToRead)
        public
        if_prl()
    {
        daoWhitelistingStorage().setWhitelisted(_contract, _senderIsAllowedToRead);
    }
}
