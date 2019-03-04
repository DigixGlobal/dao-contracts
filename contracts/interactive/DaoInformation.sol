pragma solidity ^0.4.25;

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
      "_isDigix": "Boolean, true if the user is a Digix founder",
      "_redeemedBadge": "Boolean, true if the user has redeemed a DGD badge in DigixDAO",
      "_lastParticipatedQuarter": "The last quarter in which this user has/had participated in DigixDAO",
      "_lastParticipatedQuarter": "The last quarter in which this user's reputation was updated in DigixDAO, equal to (currentQuarter - 1) if its updated at the moment",
      "_lockedDgdStake": "The locked stage of this user in the current quarter",
      "_lockedDgd": "The actual locked DGDs by this user in our contracts",
      "_reputationPoints": "The cumulative reputation points accumulated by this user in DigixDAO",
      "_quarterPoints": "Quarter points of this user in the current quarter",
      "_claimableDgx": "DGX (in grams) that can be claimed by this user from DigixDAO"
    }
    */
    function readUserInfo(address _user)
        public
        view
        returns (
            bool _isParticipant,
            bool _isModerator,
            bool _isDigix,
            bool _redeemedBadge,
            uint256 _lastParticipatedQuarter,
            uint256 _lastQuarterThatReputationWasUpdated,
            uint256 _lockedDgdStake,
            uint256 _lockedDgd,
            uint256 _reputationPoints,
            uint256 _quarterPoints,
            uint256 _claimableDgx
        )
    {
         _lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(_user);
         _lastQuarterThatReputationWasUpdated = daoRewardsStorage().lastQuarterThatReputationWasUpdated(_user);
         _redeemedBadge = daoStakeStorage().redeemedBadge(_user);
         (_lockedDgd, _lockedDgdStake) = daoStakeStorage().readUserDGDStake(_user);
         _reputationPoints = daoPointsStorage().getReputation(_user);
         _quarterPoints = daoPointsStorage().getQuarterPoint(_user, currentQuarterNumber());
         _isParticipant = isParticipant(_user);
         _isModerator = isModerator(_user);
         _isDigix = identity_storage().read_user_role_id(_user) == ROLES_FOUNDERS;
         _claimableDgx = daoRewardsStorage().claimableDGXs(_user);
    }

    /**
    @notice Function to read DigixDAO specific information
    @return {
      "_currentQuarterNumber": "The current quarter number of DigixDAO (starts from 1)",
      "_dgxDistributionDay": "The unix timestamp at which the quarter was initialized",
      "_startOfQuarter": "The unix timestamp when the current quarter started",
      "_startOfMainPhase": "The unix timestamp when the main phase of current quarter has/will start",
      "_startOfNextQuarter": "The unix timestamp when the next quarter begins",
      "_isMainPhase": "Boolean, true if this is the main phase, false if this is the locking phase",
      "_nModerators": "Number of moderators in DigixDAO",
      "_nParticipants": "Number of participants in DigixDAO"
    }
    */
    function readDaoInfo()
        public
        view
        returns (
            uint256 _currentQuarterNumber,
            uint256 _startOfQuarter,
            uint256 _startOfMainPhase,
            uint256 _startOfNextQuarter,
            bool _isMainPhase,
            bool _isGlobalRewardsSet,
            uint256 _nModerators,
            uint256 _nParticipants
        )
    {
        _currentQuarterNumber = currentQuarterNumber();
        _startOfQuarter = now.sub(currentTimeInQuarter());
        _startOfMainPhase = _startOfQuarter.add(getUintConfig(CONFIG_LOCKING_PHASE_DURATION));
        _startOfNextQuarter = _startOfQuarter.add(getUintConfig(CONFIG_QUARTER_DURATION));
        _isMainPhase = isMainPhase();
        _isGlobalRewardsSet = daoRewardsStorage().readDgxDistributionDay(_currentQuarterNumber) > 0 ? true : false;
        _nModerators = daoStakeStorage().readTotalModerators();
        _nParticipants = daoStakeStorage().readTotalParticipant();
    }
}
