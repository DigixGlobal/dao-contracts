pragma solidity ^0.4.19;

contract PointsStorage {
  struct Token {
    mapping (address => uint256);
    uint256 totalSupply;
  }

  uint256 totalLockedDgdStake;
  Token lockedDgdStake;
  Token quarterPoint;
  Token ReputationPoint;
  mapping(uint256 => mapping(address=>uint256)) quarterPointHistory;
}
