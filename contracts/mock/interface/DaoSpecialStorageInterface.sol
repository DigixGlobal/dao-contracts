pragma solidity ^0.4.25;

contract DaoSpecialStorageInterface {
    function readComittedVote(bytes32, address) public view returns (bytes32);
    function readVote(bytes32, address) public view returns (bool, uint256);
}
