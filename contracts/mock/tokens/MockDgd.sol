pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract MockDgd is StandardToken {
  string public constant name = "MockDigixDao";
  string public constant symbol = "MDGD";
  uint8 public constant decimals = 9;

  uint256 public constant INITIAL_SUPPLY = 3000000 * (10 ** 9);

  /**
   * @dev Constructor that gives msg.sender all of existing tokens.
   */
  constructor() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
    emit Transfer(0x0, msg.sender, INITIAL_SUPPLY);
  }
}
