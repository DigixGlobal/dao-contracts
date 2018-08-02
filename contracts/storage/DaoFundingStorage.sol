pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract DaoFundingStorage is ResolverClient, DaoConstants {

    uint256 public ethInDao;

    function DaoFundingStorage(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO_FUNDING, _resolver));
    }

    function addEth(uint256 _ethAmount)
        public
    {
        require(sender_is(CONTRACT_DAO_FUNDING_MANAGER));
        ethInDao = ethInDao.add(_ethAmount);
    }

    function withdrawEth(uint256 _ethAmount)
        public
    {
        require(sender_is(CONTRACT_DAO_FUNDING_MANAGER));
        ethInDao = ethInDao.sub(_ethAmount);
    }
}
