pragma solidity ^0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract MockDGD is StandardToken {
  string public constant name = "MockDigixDao";
  string public constant symbol = "MDGD";
  uint8 public constant decimals = 18;

  uint256 public constant INITIAL_SUPPLY = 2000000 * (10 ** 18);

  /**
   * @dev Constructor that gives msg.sender all of existing tokens.
   */
  function MockDGD() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
    Transfer(0x0, msg.sender, INITIAL_SUPPLY);
  }
}
