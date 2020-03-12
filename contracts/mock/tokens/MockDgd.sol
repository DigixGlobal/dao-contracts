pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract MockDgd is StandardToken {
  string public constant name = "Kovan DigixDao Token";
  string public constant symbol = "KDGD";
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

  function transferFrom(address owner, address buyer, uint numTokens) public returns (bool _success) {
    require(numTokens <= balances[owner]);
    require(numTokens <= allowed[owner][msg.sender]);

    balances[owner] = balances[owner] - numTokens;
    allowed[owner][msg.sender] = allowed[owner][msg.sender] - numTokens;
    balances[buyer] = balances[buyer] + numTokens;

    emit Transfer(owner, buyer, numTokens);
    _success = true;
  }
}
