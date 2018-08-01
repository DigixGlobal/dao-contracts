pragma solidity ^0.4.24;

contract MockMedianizer {
    uint256 priceFeed;

    constructor() public {
        priceFeed = 500 * (10 ** 18);
    }

    function compute()
        public
        returns (uint256, bool)
    {
        return (priceFeed, true);
    }
}
