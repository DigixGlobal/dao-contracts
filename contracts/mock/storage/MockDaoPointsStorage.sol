pragma solidity ^0.4.24;

import "../../storage/DaoPointsStorage.sol";

contract MockDaoPointsStorage is DaoPointsStorage {
    constructor(address _resolver) public DaoPointsStorage(_resolver) {
    }

    function setQP(address _participant, uint256 _point, uint256 _qId) public {
        quarterPoint[_qId].totalSupply = quarterPoint[_qId].totalSupply - quarterPoint[_qId].balance[_participant] + _point;
        quarterPoint[_qId].balance[_participant] = _point;
    }

    function setModeratorQP(address _participant, uint256 _point, uint256 _qId) public {
        quarterModeratorPoint[_qId].totalSupply = quarterModeratorPoint[_qId].totalSupply - quarterModeratorPoint[_qId].balance[_participant] + _point;
        quarterModeratorPoint[_qId].balance[_participant] = _point;
    }

    function setRP(address _participant, uint256 _point) public {
        reputationPoint.totalSupply = reputationPoint.totalSupply - reputationPoint.balance[_participant] + _point;
        reputationPoint.balance[_participant] = _point;
    }

    function mock_set_qp(address[] _participants, uint256[] _points, uint256 _qId) public {
        uint256 _n = _participants.length;
        for (uint256 i = 0; i < _n; i++) {
            quarterPoint[_qId].totalSupply = quarterPoint[_qId].totalSupply - quarterPoint[_qId].balance[_participants[i]] + _points[i];
            quarterPoint[_qId].balance[_participants[i]] = _points[i];
        }
    }

    function mock_set_moderator_qp(address[] _participants, uint256[] _points, uint256 _qId) public {
        uint256 _n = _participants.length;
        for (uint256 i = 0; i < _n; i++) {
            quarterModeratorPoint[_qId].totalSupply = quarterModeratorPoint[_qId].totalSupply - quarterModeratorPoint[_qId].balance[_participants[i]] + _points[i];
            quarterModeratorPoint[_qId].balance[_participants[i]] = _points[i];
        }
    }

    function mock_set_rp(address[] _participants, uint256[] _points) public {
        uint256 _n = _participants.length;
        for (uint256 i = 0; i < _n; i++) {
            reputationPoint.totalSupply = reputationPoint.totalSupply - reputationPoint.balance[_participants[i]] + _points[i];
            reputationPoint.balance[_participants[i]] = _points[i];
        }
    }
}
