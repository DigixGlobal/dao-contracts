pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract DaoPointsStorage is ResolverClient, DaoConstants {

  struct Token {
    mapping (address => uint256) balance;
    uint256 totalSupply;
  }
  Token reputationPoint;
  mapping (uint256 => Token) quarterPoint;
  mapping (uint256 => Token) quarterBadgePoint;

  function DaoPointsStorage(address _resolver)
           public
  {
    require(init(CONTRACT_DAO_POINTS_STORAGE, _resolver));
  }

  /// @notice add quarter points for a _participant for a _quarterId
  function addQuarterPoint(address _participant, uint256 _point, uint256 _quarterId)
           if_sender_is(CONTRACT_INTERACTIVE_QUARTER_POINT)
           public
           returns (uint256 _newPoint, uint256 _newTotalPoint)
  {
    quarterPoint[_quarterId].totalSupply += _point;
    quarterPoint[_quarterId].balance[_participant] += _point;

    _newPoint = quarterPoint[_quarterId].balance[_participant];
    _newTotalPoint = quarterPoint[_quarterId].totalSupply;
  }

  function addQuarterBadgePoint(address _participant, uint256 _point, uint256 _quarterId)
    if_sender_is(CONTRACT_INTERACTIVE_QUARTER_POINT)
    public
    returns (uint256 _newPoint, uint256 _newTotalPoint)
  {
    quarterBadgePoint[_quarterId].totalSupply += _point;
    quarterBadgePoint[_quarterId].balance[_participant] += _point;

    _newPoint = quarterBadgePoint[_quarterId].balance[_participant];
    _newTotalPoint = quarterBadgePoint[_quarterId].totalSupply;
  }

  /// @notice get quarter points for a _participant in a _quarterId
  function getQuarterPoint(address _participant, uint256 _quarterId)
           public
           view
           returns (uint256 _point)
  {
    _point = quarterPoint[_quarterId].balance[_participant];
  }

  function getQuarterBadgePoint(address _participant, uint256 _quarterId)
    public
    view
    returns (uint256 _point)
  {
    _point = quarterBadgePoint[_quarterId].balance[_participant];
  }

  /// @notice get total quarter points for a particular _quarterId
  function getTotalQuarterPoint(uint256 _quarterId)
           public
           view
           returns (uint256 _totalPoint)
  {
    _totalPoint = quarterPoint[_quarterId].totalSupply;
  }

  function getTotalQuarterBadgePoint(uint256 _quarterId)
    public
    view
    returns (uint256 _totalPoint)
  {
    _totalPoint = quarterBadgePoint[_quarterId].totalSupply;
  }

  /// @notice add reputation points for a _participant
  function addReputation(address _participant, uint256 _point)
           if_sender_is(CONTRACT_INTERACTIVE_REPUTATION_POINT)
           public
           returns (uint256 _newPoint, uint256 _totalPoint)
  {
    reputationPoint.totalSupply += _point;
    reputationPoint.balance[_participant] += _point;

    _newPoint = reputationPoint.balance[_participant];
    _totalPoint = reputationPoint.totalSupply;
  }

  /// @notice subtract reputation points for a _participant
  function subtractReputation(address _participant, uint256 _point)
           if_sender_is(CONTRACT_INTERACTIVE_REPUTATION_POINT)
           public
           returns (uint256 _newPoint, uint256 _totalPoint)
  {
    uint256 _toDeduct = _point;
    if (reputationPoint.balance[_participant] > _point) {
      reputationPoint.balance[_participant] -= _point;
    } else {
      _toDeduct = reputationPoint.balance[_participant];
      reputationPoint.balance[_participant] = 0;
    }

    reputationPoint.totalSupply -= _toDeduct;

    _newPoint = reputationPoint.balance[_participant];
    _totalPoint = reputationPoint.totalSupply;
  }

  /// @notice get reputation points for a _participant
  function getReputation(address _participant)
           public
           view
           returns (uint256 _point)
  {
    _point = reputationPoint.balance[_participant];
  }

  /// @notice get total reputation points distributed in the dao
  function getTotalReputation()
           public
           view
           returns (uint256 _totalPoint)
  {
    _totalPoint = reputationPoint.totalSupply;
  }
}
