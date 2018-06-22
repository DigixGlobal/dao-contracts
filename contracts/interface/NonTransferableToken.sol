pragma solidity ^0.4.19;

contract NonTransferableToken {
  function totalSupply() public view returns (uint256);
  function balanceOf(address who) public view returns (uint256);
}
