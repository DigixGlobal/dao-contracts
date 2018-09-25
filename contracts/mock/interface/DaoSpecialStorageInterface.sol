pragma solidity ^0.4.24;

contract DaoSpecialStorageInterface {
    function readComittedVote(bytes32, address) public constant returns (bytes32);
    function readVote(bytes32, address) public constant returns (bool, uint256);
}
