pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./common/DaoConstants.sol";
import "./service/DaoInfoService.sol";

// this contract will receive DGXs fees from the DGX fees distributors
contract DaoRewardsManager is ResolverClient, DaoConstants {

  function DaoRewardsManager(address _resolver)
           public
  {
    require(init(CONTRACT_DAO_REWARDS_MANAGER, _resolver));
  }

  function dao_info_service()
           internal
           returns (DaoInfoService _contract)
  {
    _contract = DaoInfoService(get_contract(CONTRACT_DAO_INFO_SERVICE));
  }

  function claimRewards(uint256[] quarters)
           public
  {
    // check if this is the locking phase
    // calculate his rewards

  }

  /* function  */
  /* function tokenFallback(address _token, uint256 _amount, bytes32 _data)
           public
  {
    require(_token == ADDRESS_DGX_TOKEN);
    uint256 _quarterId = dao_info_service().getCurrentQuarter();
    feesCollectedHistory[_quarterId] = _amount;
    permitClaim[_quarterId] = true;
  } */

}
