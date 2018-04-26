pragma solidity ^0.4.19;

import "./../interface/NonTransferableToken.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../storage/DaoPointsStorage.sol";
import "./../common/DaoConstants.sol";

contract QuarterPoint is ResolverClient, NonTransferableToken, DaoConstants {
  string public name = "DigixDao Quarter Point";
  string public symbol = "DQP";
  uint8 public decimals = 0;

  function QuarterPoint(address _resolver)
           public
  {
    require(init(CONTRACT_INTERACTIVE_QUARTER_POINT, _resolver));
  }

  function dao_point_storage()
           internal
           constant
           returns (DaoPointsStorage _contract)
  {
    _contract = DaoPointsStorage(get_contract(CONTRACT_DAO_POINTS_STORAGE));
  }

  function dao_info_service()
           internal
           constant
           returns (DaoInfoService _contract)
  {
    _contract = DaoInfoService(get_contract(CONTRACT_DAO_INFO_SERVICE));
  }

  /// @notice display quarter points for the current quarter
  /// @param _who the account to query
  /// @return {
  ///    "_balance": "quarter point balance of the given account in the current quarter"
  /// }
  function balanceOf(address _who)
           public
           constant
           returns (uint256 _balance)
  {
    uint256 _currentQuarterId = dao_info_service().getCurrentQuarter();
    _balance = dao_point_storage().getQuarterPoint(_who, _currentQuarterId);
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
           returns (uint256 _balance)
  {
    _balance = dao_point_storage().getQuarterPoint(_who, _quarterId);
  }

  /// @notice display total quarter points for the current quarter
  /// @return {
  ///    "_supply": "total quarter point supply in the current quarter"
  /// }
  function totalSupply()
           public
           constant
           returns (uint256 _supply)
  {
    uint256 _currentQuarterId = dao_info_service().getCurrentQuarter();
    _supply = dao_point_storage().getTotalQuarterPoint(_currentQuarterId);
  }

  /// @notice display total quarter points for the given quarter
  /// @param _quarterId the quarter ID of the quarter to query total supply for
  /// @return {
  ///    "_supply": "total quarter point supply in the given quarter"
  /// }
  function totalSupplyInQuarter(uint256 _quarterId)
           public
           constant
           returns (uint256 _supply)
  {
    _supply = dao_point_storage().getTotalQuarterPoint(_quarterId);
  }
}
