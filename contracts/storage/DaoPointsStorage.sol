pragma solidity ^0.4.25;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract DaoPointsStorage is ResolverClient, DaoConstants {

    // struct for a non-transferrable token
    struct Token {
        mapping (address => uint256) balance;
        uint256 totalSupply;
    }

    // the reputation point token
    // since reputation is cumulative, we only need to store one value
    Token reputationPoint;

    // since quarter points are specific to quarters, we need a mapping from
    // quarter number to the quarter point token for that quarter
    mapping (uint256 => Token) quarterPoint;

    // the same is the case with quarter moderator points
    // these are specific to quarters
    mapping (uint256 => Token) quarterModeratorPoint;

    constructor(address _resolver)
        public
    {
        require(init(CONTRACT_STORAGE_DAO_POINTS, _resolver));
    }

    /// @notice add quarter points for a _participant for a _quarterNumber
    function addQuarterPoint(address _participant, uint256 _point, uint256 _quarterNumber)
        public
        returns (uint256 _newPoint, uint256 _newTotalPoint)
    {
        require(sender_is_from([CONTRACT_DAO_VOTING, CONTRACT_DAO_VOTING_CLAIMS, EMPTY_BYTES]));
        quarterPoint[_quarterNumber].totalSupply = quarterPoint[_quarterNumber].totalSupply.add(_point);
        quarterPoint[_quarterNumber].balance[_participant] = quarterPoint[_quarterNumber].balance[_participant].add(_point);

        _newPoint = quarterPoint[_quarterNumber].balance[_participant];
        _newTotalPoint = quarterPoint[_quarterNumber].totalSupply;
    }

    function addModeratorQuarterPoint(address _participant, uint256 _point, uint256 _quarterNumber)
        public
        returns (uint256 _newPoint, uint256 _newTotalPoint)
    {
        require(sender_is_from([CONTRACT_DAO_VOTING, CONTRACT_DAO_VOTING_CLAIMS, EMPTY_BYTES]));
        quarterModeratorPoint[_quarterNumber].totalSupply = quarterModeratorPoint[_quarterNumber].totalSupply.add(_point);
        quarterModeratorPoint[_quarterNumber].balance[_participant] = quarterModeratorPoint[_quarterNumber].balance[_participant].add(_point);

        _newPoint = quarterModeratorPoint[_quarterNumber].balance[_participant];
        _newTotalPoint = quarterModeratorPoint[_quarterNumber].totalSupply;
    }

    /// @notice get quarter points for a _participant in a _quarterNumber
    function getQuarterPoint(address _participant, uint256 _quarterNumber)
        public
        view
        returns (uint256 _point)
    {
        _point = quarterPoint[_quarterNumber].balance[_participant];
    }

    function getQuarterModeratorPoint(address _participant, uint256 _quarterNumber)
        public
        view
        returns (uint256 _point)
    {
        _point = quarterModeratorPoint[_quarterNumber].balance[_participant];
    }

    /// @notice get total quarter points for a particular _quarterNumber
    function getTotalQuarterPoint(uint256 _quarterNumber)
        public
        view
        returns (uint256 _totalPoint)
    {
        _totalPoint = quarterPoint[_quarterNumber].totalSupply;
    }

    function getTotalQuarterModeratorPoint(uint256 _quarterNumber)
        public
        view
        returns (uint256 _totalPoint)
    {
        _totalPoint = quarterModeratorPoint[_quarterNumber].totalSupply;
    }

    /// @notice add reputation points for a _participant
    function increaseReputation(address _participant, uint256 _point)
        public
        returns (uint256 _newPoint, uint256 _totalPoint)
    {
        require(sender_is_from([CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_REWARDS_MANAGER, CONTRACT_DAO_STAKE_LOCKING]));
        reputationPoint.totalSupply = reputationPoint.totalSupply.add(_point);
        reputationPoint.balance[_participant] = reputationPoint.balance[_participant].add(_point);

        _newPoint = reputationPoint.balance[_participant];
        _totalPoint = reputationPoint.totalSupply;
    }

    /// @notice subtract reputation points for a _participant
    function reduceReputation(address _participant, uint256 _point)
        public
        returns (uint256 _newPoint, uint256 _totalPoint)
    {
        require(sender_is_from([CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_REWARDS_MANAGER, EMPTY_BYTES]));
        uint256 _toDeduct = _point;
        if (reputationPoint.balance[_participant] > _point) {
            reputationPoint.balance[_participant] = reputationPoint.balance[_participant].sub(_point);
        } else {
            _toDeduct = reputationPoint.balance[_participant];
            reputationPoint.balance[_participant] = 0;
        }

        reputationPoint.totalSupply = reputationPoint.totalSupply.sub(_toDeduct);

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
