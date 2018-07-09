pragma solidity ^0.4.19;

import "./common/DaoConstants.sol";
import "./common/DaoCommon.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";

contract DaoWhitelisting is ResolverClient, DaoConstants, DaoCommon {

    function DaoWhitelisting(address _resolver, address[] _initialWhitelist)
        public
    {
        require(init(CONTRACT_DAO_WHITELISTING, _resolver));

        uint256 _n = _initialWhitelist.length;
        for (uint256 i = 0; i < _n; i++) {
            daoWhitelistingStorage().setWhitelisted(_initialWhitelist[i], true);
        }
    }

    function setWhitelisted(address _contract, bool _isWhitelisted)
        public
        if_prl()
    {
        daoWhitelistingStorage().setWhitelisted(_contract, _isWhitelisted);
    }
}
