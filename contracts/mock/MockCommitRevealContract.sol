pragma solidity ^0.4.23;

contract MockCommitRevealContract {
  bytes32 public commit1;
  bytes32 public commit2;
  bytes32 public solidityCommit1;
  bytes32 public solidityCommit2;

  function setCommit(bytes32 _commit1, bytes32 _commit2)
    public
  {
    commit1 = _commit1;
    commit2 = _commit2;
  }

  function computeSolidityCommit(string _raw1, string _raw2)
    public
  {
    solidityCommit1 = keccak256(_raw1);
    solidityCommit2 = keccak256(_raw2);
  }
}
