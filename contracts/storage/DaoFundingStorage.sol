pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";
import "../common/DaoConstants.sol";

contract DaoFundingStorage is ResolverClient, DaoConstants {

    uint256 public ethInDao;

    function DaoFundingStorage(address _resolver) public {
        require(init(CONTRACT_DAO_FUNDING_STORAGE, _resolver));
    }

    function addEth(uint256 _ethAmount)
        if_sender_is(CONTRACT_DAO_FUNDING_MANAGER)
        public
    {
        ethInDao += _ethAmount;
    }

    function withdrawEth(uint256 _ethAmount)
        if_sender_is(CONTRACT_DAO_FUNDING_MANAGER)
        public
    {
        ethInDao -= _ethAmount;
    }
}
