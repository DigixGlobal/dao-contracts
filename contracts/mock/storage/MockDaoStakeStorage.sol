pragma solidity ^0.4.24;

import "../../storage/DaoStakeStorage.sol";

contract MockDaoStakeStorage is DaoStakeStorage {

    constructor(address _resolver) DaoStakeStorage(_resolver) public {}

    function mock_add_moderators(address[] _moderators, uint256[] _dgdStake)
        public
    {
        uint256 _n = _moderators.length;
        for (uint256 i = 0; i < _n; i++) {
            allModerators.append(_moderators[i]);
            actualLockedDGD[_moderators[i]] = _dgdStake[i];
            lockedDGDStake[_moderators[i]] = _dgdStake[i];
            totalModeratorLockedDGDStake += _dgdStake[i];
        }
    }

    function mock_add_participants(address[] _participants, uint256[] _dgdStake)
        public
    {
        uint256 _n = _participants.length;
        for (uint256 i = 0; i < _n; i++) {
            allParticipants.append(_participants[i]);
            actualLockedDGD[_participants[i]] = _dgdStake[i];
            lockedDGDStake[_participants[i]] = _dgdStake[i];
            totalLockedDGDStake += _dgdStake[i];
        }
    }
}
