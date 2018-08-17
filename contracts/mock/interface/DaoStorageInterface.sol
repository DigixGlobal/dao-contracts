pragma solidity ^0.4.24;

contract DaoStorageInterface {
    function readVotingRoundVotes(bytes32, uint256, address[], bool) public constant returns (address[], uint256);
    function readDraftVote(bytes32, address) public constant returns (bool, uint256);
    function readCommitVote(bytes32, uint256, address) public constant returns (bytes32);
    function readVote(bytes32, uint256, address) public constant returns (bool, uint256);
}
