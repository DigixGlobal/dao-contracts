pragma solidity ^0.4.25;

contract DaoStorageInterface {
    function readVotingRoundVotes(bytes32, uint256, address[], bool) public view returns (address[], uint256);
    function readDraftVote(bytes32, address) public view returns (bool, uint256);
    function readComittedVote(bytes32, uint256, address) public view returns (bytes32);
    function readVote(bytes32, uint256, address) public view returns (bool, uint256);
}
