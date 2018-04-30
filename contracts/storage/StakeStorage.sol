pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract StakeStorage is ResolverClient, DaoConstants {
    mapping (address => uint256) lockedDGDStake;
    mapping (address => uint256) actualLockedDGD;
    mapping (address => uint256) lockedBadge;

    function StakeStorage(address _resolver) public {
        require(init(CONTRACT_STORAGE_STAKE, _resolver));
    }

    function updateUserDGDStake(address _user, uint256 _actualLockedDGD, uint256 _lockedDGDStake)
        if_sender_is(CONTRACT_STAKE_LOCKING)
        public
    {
        actualLockedDGD[_user] = _actualLockedDGD;
        lockedDGDStake[_user] = _lockedDGDStake;
    }

    function updateUserBadgeStake(address _user, uint256 _lockedBadge)
        if_sender_is(CONTRACT_STAKE_LOCKING)
        public
    {
        lockedBadge[_user] = _lockedBadge;
    }

    function readUserDGDStake(address _user)
        public
        constant
        returns (
            uint256 _actualLockedDGD,
            uint256 _lockedDGDStake
        )
    {
        _actualLockedDGD = actualLockedDGD[_user];
        _lockedDGDStake = lockedDGDStake[_user];
    }

    function readUserLockedBadge(address _user)
        public
        constant
        returns (uint256 _lockedBadge)
    {
        _lockedBadge = lockedBadge[_user];
    }
}
