pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";

// this contract will receive DGXs fees from the DGX fees distributors
contract DaoRewardsManager is ResolverClient {

  uint256 total_dgx_current_quarter;
  mapping(uint256=>uint256) feesCollectedHistory;

  function DaoRoles(address _resolver) public {
    require(init(CONTRACT_REWARDS_MANAGER, _resolver));
  }

  function claimRewards(uint256[] quarters) {
    // check if this is the locking phase
    // calculate his rewards

  }

  function tokenFallback(address _token, uint256 _amount, bytes32 _data) {
    require(_token == DGX_TOKEN_ADDRESS);
    ///
  }

}
