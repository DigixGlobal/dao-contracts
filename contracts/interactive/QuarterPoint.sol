pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../service/DaoInfoService.sol";
import "./../storage/DaoPointsStorage.sol";
import "./../common/DaoConstants.sol";

contract QuarterPoint is ResolverClient, DaoConstants {
  string public name = "DigixDao Quarter Point";
  string public symbol = "DQP";
  uint8 public decimals = 0;

  function QuarterPoint(address _resolver)
           public
  {
    require(init(CONTRACT_INTERACTIVE_QUARTER_POINT, _resolver));
  }

  function daoPointsStorage()
           internal
           constant
           returns (DaoPointsStorage _contract)
  {
    _contract = DaoPointsStorage(get_contract(CONTRACT_DAO_POINTS_STORAGE));
  }

  function daoInfoService()
           internal
           constant
           returns (DaoInfoService _contract)
  {
    _contract = DaoInfoService(get_contract(CONTRACT_DAO_INFO_SERVICE));
  }

  function add(address _who, uint256 _value, uint256 _quarterId, bool _isBadge)
      public
      if_sender_is_from([CONTRACT_DAO_VOTING, CONTRACT_DAO_VOTING_CLAIMS, EMPTY_BYTES])
      returns (uint256 _newPoint, uint256 _newTotalPoint)
  {
      require(_value > 0);
      if (_isBadge) {
        (_newPoint, _newTotalPoint) = daoPointsStorage().addQuarterBadgePoint(_who, _value, _quarterId);
      } else {
        (_newPoint, _newTotalPoint) = daoPointsStorage().addQuarterPoint(_who, _value, _quarterId);
      }
  }

  /// @notice display quarter points for the current quarter
  /// @param _who the account to query
  /// @return {
  ///    "_balance": "quarter point balance of the given account in the current quarter"
  /// }
  function balanceOf(address _who, uint256 _quarterId)
           public
           constant
           returns (uint256 _quarterPoint, uint256 _quarterBadgePoint)
  {
    _quarterPoint = daoPointsStorage().getQuarterPoint(_who, _quarterId);
    _quarterBadgePoint = daoPointsStorage().getQuarterBadgePoint(_who, _quarterId);
  }

  /// @notice display quarter points for an account for the given quarter
  /// @param _who the account to query
  /// @param _quarterId the quarter ID of the quarter to query
  /// @return {
  ///    "_balance": "quarter point balance of the given account for the given quarter"
  /// }
  function balanceInQuarter(address _who, uint256 _quarterId)
           public
           constant
           returns (uint256 _quarterPoint, uint256 _quarterBadgePoint)
  {
    _quarterPoint = daoPointsStorage().getQuarterPoint(_who, _quarterId);
    _quarterBadgePoint = daoPointsStorage().getQuarterBadgePoint(_who, _quarterId);
  }

  /// @notice display total quarter points for the current quarter
  /// @return {
  ///    "_supply": "total quarter point supply in the current quarter"
  /// }
  function totalSupply(uint256 _quarterId)
           public
           constant
           returns (uint256 _totalQuarterPoint, uint256 _totalQuarterBadgePoint)
  {
    _totalQuarterPoint = daoPointsStorage().getTotalQuarterPoint(_quarterId);
    _totalQuarterBadgePoint = daoPointsStorage().getTotalQuarterBadgePoint(_quarterId);
  }

  /// @notice display total quarter points for the given quarter
  /// @param _quarterId the quarter ID of the quarter to query total supply for
  /// @return {
  ///    "_supply": "total quarter point supply in the given quarter"
  /// }
  function totalSupplyInQuarter(uint256 _quarterId)
           public
           constant
           returns (uint256 _totalQuarterPoint, uint256 _totalQuarterBadgePoint)
  {
    _totalQuarterPoint = daoPointsStorage().getTotalQuarterPoint(_quarterId);
    _totalQuarterBadgePoint = daoPointsStorage().getTotalQuarterBadgePoint(_quarterId);
  }
}
