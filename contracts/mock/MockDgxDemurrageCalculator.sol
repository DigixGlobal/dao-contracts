pragma solidity ^0.4.19;

import "@digix/lite-dgx-contract/contracts/DummyDGX.sol";

/// @title Digix Gold Token Demurrage Calculator
/// @author Digix Holdings Pte Ltd
/// @notice This contract is meant to be used by exchanges/other parties who want to calculate the DGX demurrage fees, provided an initial balance and the days elapsed
contract MockDgxDemurrageCalculator {
  address public TOKEN_ADDRESS;

  function token() internal view returns (DummyDGX _token) {
    _token = DummyDGX(TOKEN_ADDRESS);
  }

  constructor(address _token_address) public {
    TOKEN_ADDRESS = _token_address;
  }

  function calculateDemurrage(uint256 _initial_balance, uint256 _days_elapsed)
           public
           view
           returns (uint256 _demurrage_fees, bool _no_demurrage_fees)
  {
    uint256 _base;
    uint256 _rate;
    (_base, _rate,,_no_demurrage_fees) = token().showDemurrageConfigs();
    _demurrage_fees = (_initial_balance * _days_elapsed * _rate) / _base;
  }
}
