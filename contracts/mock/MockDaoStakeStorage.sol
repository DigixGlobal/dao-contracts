pragma solidity ^0.4.19;

import "./../storage/DaoStakeStorage.sol";

contract MockDaoStakeStorage is DaoStakeStorage {

    function MockDaoStakeStorage(address _resolver) DaoStakeStorage(_resolver) public {}

    function mock_add_moderators(address[] _moderators)
        public
    {
        uint256 _n = _moderators.length;
        for (uint256 i = 0; i < _n; i++) {
            allModerators.append(_moderators[i]);
            totalModeratorLockedDGDStake += lockedDGDStake[_moderators[i]];
        }
    }

    function mock_add_participants(address[] _participants)
        public
    {
        uint256 _n = _participants.length;
        for (uint256 i = 0; i < _n; i++) {
            allParticipants.append(_participants[i]);
        }
    }

    function mock_add_dgd_stake(address[] _participants, uint256[] _dgdStake)
        public
    {
        uint256 _n = _participants.length;
        for (uint256 i = 0; i < _n; i++) {
            actualLockedDGD[_participants[i]] = _dgdStake[i];
            lockedDGDStake[_participants[i]] = _dgdStake[i];
            totalLockedDGDStake += _dgdStake[i];
        }
    }
}
