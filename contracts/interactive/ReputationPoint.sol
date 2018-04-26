pragma solidity ^0.4.19;

import "./../interface/NonTransferableToken.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../storage/DaoPointsStorage.sol";
import "./../common/DaoConstants.sol";

contract ReputationPoint is ResolverClient, NonTransferableToken, DaoConstants {
  string public name = "DigixDao Reputation Point";
  string public symbol = "DRP";
  uint8 public decimals = 0;

  function ReputationPoint(address _resolver)
           public
  {
    require(init(CONTRACT_INTERACTIVE_REPUTATION_POINT, _resolver));
  }
  
  function dao_point_storage()
           internal
           constant
           returns (DaoPointsStorage _contract)
  {
    _contract = DaoPointsStorage(get_contract(CONTRACT_DAO_POINTS_STORAGE));
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
    _balance = dao_point_storage().getReputation(_who);
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
    _supply = dao_point_storage().getTotalReputation();
  }
}
