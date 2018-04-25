pragma solidity ^0.4.19;

contract PointsStorage {
  struct Token {
    mapping (address => uint256) balance;
    uint256 totalSupply;
  }
  Token ReputationPoint;
  mapping (uint256 => Token) quarterPoint;

  /// @notice add quarter points for a _participant in the current quarter
  function addQuarterPoint(address _participant, uint256 _point)
           public
           returns (bool _success)
  {

  }

  /// @notice get quarter points for a _participant in a _quarterId
  function getQuarterPoint(address _participant, uint256 _quarterId)
           public
           returns (uint256 _point)
  {

  }

  /// @notice get total quarter points for a particular _quarterId
  function getTotalQuarterPoint(uint256 _quarterId)
           public
           returns (uint256 _totalPoint)
  {

  }

  /// @notice add reputation points for a _participant
  function addReputation(address _participant, uint256 _point)
           public
           returns (uint256 _success)
  {

  }

  /// @notice subtract reputation points for a _participant
  function subtractReputation(address _participant, uint256 _point)
           public
           returns (uint256 _success)
  {

  }

  /// @notice get reputation points for a _participant
  function getReputation(address _participant)
           public
           returns (uint256 _point)
  {

  }

  /// @notice get total reputation points distributed in the dao
  function getTotalReputation()
           public
           returns (uint256 _totalPoint)
  {

  }
}
