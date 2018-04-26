pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../service/DaoService.sol";
import "../lib/MathHelper.sol";
import "../common/DaoConstants.sol";

contract DaoPointsStorage is ResolverClient, DaoConstants {
  struct Token {
    mapping (address => uint256) balance;
    uint256 totalSupply;
  }
  Token reputationPoint;
  mapping (uint256 => Token) quarterPoint;

  function DaoPointsStorage(address _resolver)
           public
  {
    require(init(CONTRACT_DAO_POINTS_STORAGE, _resolver));
  }

  function dao_service()
           internal
           returns (DaoService _contract)
  {
    _contract = DaoService(get_contract(CONTRACT_DAO_SERVICE));
  }

  /// @notice add quarter points for a _participant in the current quarter
  function addQuarterPoint(address _participant, uint256 _point)
           if_sender_is(CONTRACT_INTERACTIVE_QUARTER_POINTS)
           public
           returns (bool _success)
  {
    uint256 _currentQuarter = MathHelper.currentQuarter(dao_service().getDaoStartTime());
    quarterPoint[_currentQuarter].totalSupply += _point;
    quarterPoint[_currentQuarter].balance[_participant] += _point;

    _success = true;
  }

  /// @notice get quarter points for a _participant in a _quarterId
  function getQuarterPoint(address _participant, uint256 _quarterId)
           public
           returns (uint256 _point)
  {
    _point = quarterPoint[_quarterId].balance[_participant];
  }

  /// @notice get total quarter points for a particular _quarterId
  function getTotalQuarterPoint(uint256 _quarterId)
           public
           returns (uint256 _totalPoint)
  {
    _totalPoint = quarterPoint[_quarterId].totalSupply;
  }

  /// @notice add reputation points for a _participant
  function addReputation(address _participant, uint256 _point)
           if_sender_is(CONTRACT_INTERACTIVE_REPUTATION_POINTS)
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
           if_sender_is(CONTRACT_INTERACTIVE_REPUTATION_POINTS)
           public
           returns (uint256 _newPoint, uint256 _totalPoint)
  {
    if (reputationPoint.totalSupply > _point) {
      reputationPoint.totalSupply -= _point;
    } else {
      reputationPoint.totalSupply = 0;
    }

    if (reputationPoint.balance[_participant] > _point) {
      reputationPoint.balance[_participant] -= _point;
    } else {
      reputationPoint.balance[_participant] = 0;
    }

    _newPoint = reputationPoint.balance[_participant];
    _totalPoint = reputationPoint.totalSupply;
  }

  /// @notice get reputation points for a _participant
  function getReputation(address _participant)
           public
           returns (uint256 _point)
  {
    _point = reputationPoint.balance[_participant];
  }

  /// @notice get total reputation points distributed in the dao
  function getTotalReputation()
           public
           returns (uint256 _totalPoint)
  {
    _totalPoint = reputationPoint.totalSupply;
  }
}
