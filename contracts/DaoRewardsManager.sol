pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./DaoConstants.sol";

// this contract will receive DGXs fees from the DGX fees distributors
contract DaoRewardsManager is ResolverClient, DaoConstants {

  uint256 total_dgx_current_quarter;
  mapping(uint256=>uint256) feesCollectedHistory;

  function DaoRoles(address _resolver)
           public
  {
    require(init(CONTRACT_DAO_REWARDS_MANAGER, _resolver));
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
    ///
  }

}
