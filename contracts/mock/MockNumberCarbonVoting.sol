pragma solidity ^0.4.24;

contract MockNumberCarbonVoting {

    bytes32 public name;
    mapping(address => bool) public voted;

    constructor(bytes32 _name) public {
        name = _name;
    }

    function mock_set_voted(address _user)
        public
    {
        voted[_user] = true;
    }
}
