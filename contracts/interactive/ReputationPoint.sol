pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../storage/DaoPointsStorage.sol";
import "./../common/DaoConstants.sol";

contract ReputationPoint is ResolverClient, DaoConstants {
  string public name = "DigixDao Reputation Point";
  string public symbol = "DRP";
  uint8 public decimals = 0;

  function ReputationPoint(address _resolver)
           public
  {
    require(init(CONTRACT_INTERACTIVE_REPUTATION_POINT, _resolver));
  }

  function daoPointsStorage()
           internal
           constant
           returns (DaoPointsStorage _contract)
  {
    _contract = DaoPointsStorage(get_contract(CONTRACT_DAO_POINTS_STORAGE));
  }

  function add(address _who, uint256 _value)
      public
      if_sender_is(CONTRACT_DAO)
      returns (uint256 _newPoint, uint256 _newTotalPoint)
  {
      require(_value > 0);
      (_newPoint, _newTotalPoint) = daoPointsStorage().addReputation(_who, _value);
  }

  function subtract(address _who, uint256 _value)
      public
      if_sender_is(CONTRACT_DAO)
      returns (uint256 _newPoint, uint256 _newTotalPoint)
  {
      require(_value > 0);
      (_newPoint, _newTotalPoint) = daoPointsStorage().subtractReputation(_who, _value);
  }

  /// @notice display reputation points for the given account
  /// @param _who the account to query
  /// @return {
  ///    "balance": "cumulative reputation point balance of the given account"
  /// }
  function balanceOf(address _who)
           public
           constant
           returns (uint256 _balance)
  {
    _balance = daoPointsStorage().getReputation(_who);
  }

  /// @notice display total reputation points for the dao
  /// @return {
  ///    "_supply": "total reputation point supply in the dao"
  /// }
  function totalSupply()
           public
           constant
           returns (uint256 _supply)
  {
    _supply = daoPointsStorage().getTotalReputation();
  }
}
