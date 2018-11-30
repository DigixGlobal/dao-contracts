pragma solidity ^0.4.25;

import "./../MockNumberCarbonVoting.sol";

contract NumberCarbonVoting2 is MockNumberCarbonVoting {
    constructor(bytes32 _name) public MockNumberCarbonVoting(_name) {}
}
