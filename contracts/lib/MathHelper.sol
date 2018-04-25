pragma solidity ^0.4.19;

library MathHelper {
  function currentQuarter(uint256 _start)
           public
           constant
           returns (uint256 _quarterId)
  {
    _quarterId = (now - _start) / (90 days);
  }

  // functions to calculate points/rewards
}
