pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract MockBadge is StandardToken {
  string public constant name = "Kovan DGD Badge";
  string public constant symbol = "KDGB";
  uint8 public constant decimals = 0;

  uint256 public constant INITIAL_SUPPLY = 200;

  /**
   * @dev Constructor that gives msg.sender all of existing tokens.
   */
  constructor() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
    emit Transfer(0x0, msg.sender, INITIAL_SUPPLY);
  }
}
