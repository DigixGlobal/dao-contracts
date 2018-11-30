pragma solidity ^0.4.24;

import "./../common/DaoCommon.sol";

/**
@title Contract (read-only) to read information from DAO
@dev cannot introduce more read methods in other contracts due to deployment gas limit
@author Digix Holdings
*/
contract DaoInformation is DaoCommon {

    constructor(address _resolver)
        public
    {
        require(init(CONTRACT_DAO_INFORMATION, _resolver));
    }

    /**
    @notice Function to read user specific information
    @param _user Ethereum address of the user
    @return {
      "_isParticipant": "Boolean, true if the user is a DigixDAO participant in the current quarter",
      "_isModerator": "Boolean, true if the user is a DigixDAO moderator in the current quarter",
      "_lastParticipatedQuarter": "The last quarter in which this user has/had participated in DigixDAO",
      "_lockedDgdStake": "The locked stage of this user in the current quarter",
      "_lockedDgd": "The actual locked DGDs by this user in our contracts",
      "_reputationPoints": "The cumulative reputation points accumulated by this user in DigixDAO",
      "_quarterPoints": "Quarter points of this user in the current quarter"
    }
    */
    function readUserInfo(address _user)
        public
        constant
        returns (
            bool _isParticipant,
            bool _isModerator,
            uint256 _lastParticipatedQuarter,
            uint256 _lockedDgdStake,
            uint256 _lockedDgd,
            uint256 _reputationPoints,
            uint256 _quarterPoints
        )
    {
         _lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(_user);
         (_lockedDgd, _lockedDgdStake) = daoStakeStorage().readUserDGDStake(_user);
         _reputationPoints = daoPointsStorage().getReputation(_user);
         _quarterPoints = daoPointsStorage().getQuarterPoint(_user, currentQuarterNumber());
         _isParticipant = isParticipant(_user);
         _isModerator = isModerator(_user);
    }

    /**
    @notice Function to read DigixDAO specific information
    @return {
      "_currentQuarterNumber": "The current quarter number of DigixDAO (starts from 1)",
      "_startOfQuarter": "The unix timestamp when the current quarter started",
      "_startOfMainPhase": "The unix timestamp when the main phase of current quarter has/will start",
      "_startOfNextQuarter": "The unix timestamp when the next quarter begins",
      "_isMainPhase": "Boolean, true if this is the main phase, false if this is the locking phase"
    }
    */
    function readDaoInfo()
        public
        constant
        returns (
            uint256 _currentQuarterNumber,
            uint256 _startOfQuarter,
            uint256 _startOfMainPhase,
            uint256 _startOfNextQuarter,
            bool _isMainPhase
        )
    {
        _currentQuarterNumber = currentQuarterNumber();
        _startOfQuarter = now.sub(currentTimeInQuarter());
        _startOfMainPhase = _startOfQuarter.add(getUintConfig(CONFIG_LOCKING_PHASE_DURATION));
        _startOfNextQuarter = _startOfQuarter.add(getUintConfig(CONFIG_QUARTER_DURATION));
        _isMainPhase = isMainPhase();
    }
}
