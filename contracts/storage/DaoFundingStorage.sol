pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract DaoFundingStorage is ResolverClient, DaoConstants {

    uint256 public ethInDao;
    mapping (address => uint256) public claimableEth;

    function DaoFundingStorage(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO_FUNDING, _resolver));
    }

    function updateClaimableEth(address _proposer, uint256 _value)
        if_sender_is(CONTRACT_DAO_FUNDING_MANAGER)
        public
    {
        claimableEth[_proposer] = _value;
    }

    // TODO: Add SafeMath
    function addEth(uint256 _ethAmount)
        if_sender_is(CONTRACT_DAO_FUNDING_MANAGER)
        public
    {
        ethInDao = ethInDao.add(_ethAmount);
    }

    // TODO: Add SafeMath
    function withdrawEth(uint256 _ethAmount)
        if_sender_is(CONTRACT_DAO_FUNDING_MANAGER)
        public
    {
        ethInDao = ethInDao.sub(_ethAmount);
    }
}
