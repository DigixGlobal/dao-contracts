pragma solidity ^0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract MockBadge is StandardToken {
  string public constant name = "MockBadge";
  string public constant symbol = "MDGB";
  uint8 public constant decimals = 0;

  uint256 public constant INITIAL_SUPPLY = 150;

  /**
   * @dev Constructor that gives msg.sender all of existing tokens.
   */
  function MockBadge() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
    Transfer(0x0, msg.sender, INITIAL_SUPPLY);
  }
}