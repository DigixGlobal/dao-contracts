pragma solidity ^0.4.23;

import "./../storage/DaoPointsStorage.sol";

contract MockDaoPointsStorage is DaoPointsStorage {
  function MockDaoPointsStorage(address _resolver) public DaoPointsStorage(_resolver) {
  }

  function setQP(address _participant, uint256 _point, uint256 _qId) {
    quarterPoint[_qId].totalSupply = quarterPoint[_qId].totalSupply - quarterPoint[_qId].balance[_participant] + _point;
    quarterPoint[_qId].balance[_participant] = _point;
  }

  function setModeratorQP(address _participant, uint256 _point, uint256 _qId) {
    quarterModeratorPoint[_qId].totalSupply = quarterModeratorPoint[_qId].totalSupply - quarterModeratorPoint[_qId].balance[_participant] + _point;
    quarterModeratorPoint[_qId].balance[_participant] = _point;
  }

  function setRP(address _participant, uint256 _point) {
    reputationPoint.totalSupply = reputationPoint.totalSupply - reputationPoint.balance[_participant] + _point;
    reputationPoint.balance[_participant] = _point;
  }

}
