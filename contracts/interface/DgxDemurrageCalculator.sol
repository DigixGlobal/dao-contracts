pragma solidity ^0.4.24;

/// @title Digix Gold Token Demurrage Calculator
/// @author Digix Holdings Pte Ltd
/// @notice This contract is meant to be used by exchanges/other parties who want to calculate the DGX demurrage fees, provided an initial balance and the days elapsed
contract DgxDemurrageCalculator {
    function calculateDemurrage(uint256 _initial_balance, uint256 _days_elapsed)
        public
        view
        returns (uint256 _demurrage_fees, bool _no_demurrage_fees);
}
