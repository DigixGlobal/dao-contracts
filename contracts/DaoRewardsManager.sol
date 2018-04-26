pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./common/DaoConstants.sol";
import "./service/DaoService.sol";

// this contract will receive DGXs fees from the DGX fees distributors
contract DaoRewardsManager is ResolverClient, DaoConstants {

  // fees collected by quarterId
  mapping(uint256 => uint256) feesCollectedHistory;

  // permit claiming rewards by quarterId
  mapping(uint256 => bool) permitClaim;

  function DaoRoles(address _resolver)
           public
  {
    require(init(CONTRACT_DAO_REWARDS_MANAGER, _resolver));
  }

  function dao_service()
           internal
           returns (DaoService _contract)
  {
    _contract = DaoService(get_contract(CONTRACT_DAO_SERVICE));
  }

  function claimRewards(uint256[] quarters)
           public
  {
    // check if this is the locking phase
    // calculate his rewards

  }

  function tokenFallback(address _token, uint256 _amount, bytes32 _data)
           public
  {
    require(_token == ADDRESS_DGX_TOKEN);
    uint256 _quarterId = dao_service().getCurrentQuarter();
    feesCollectedHistory[_quarterId] = _amount;
    permitClaim[_quarterId] = true;
  }

}
