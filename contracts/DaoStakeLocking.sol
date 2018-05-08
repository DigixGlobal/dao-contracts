pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import "./lib/MathHelper.sol";
import "./common/DaoCommon.sol";

contract DaoStakeLocking is DaoCommon {

    function DaoStakeLocking(address _resolver) public {
        require(init(CONTRACT_DAO_STAKE_LOCKING, _resolver));
    }

    function lockDGD(uint256 _amount)
        public
        returns (bool _success)
    {
        uint256 _actualLockedDGD;
        uint256 _lockedDGDStake;
        uint256 _totalLockedDGDStake = daoStakeStorage().totalLockedDGDStake();
        (_actualLockedDGD, _lockedDGDStake) = daoStakeStorage().readUserDGDStake(msg.sender);

        require(_amount > 0);
        _actualLockedDGD += _amount;
        // TODO: calculate this properly
        _lockedDGDStake += _amount;
        daoStakeStorage().updateUserDGDStake(msg.sender, _actualLockedDGD, _lockedDGDStake);
        daoStakeStorage().updateTotalLockedDGDStake(_totalLockedDGDStake + _amount);
        if (_actualLockedDGD >= CONFIG_MINIMUM_LOCKED_DGD) {
            daoStakeStorage().addParticipant(msg.sender);
        }

        // interaction happens last
        require(ERC20(ADDRESS_DGD_TOKEN).transferFrom(msg.sender, address(this), _amount));
        _success = true;
    }

    function lockBadge(uint256 _amount)
        public
        if_locking_phase()
        returns (bool _success)
    {
        uint256 _lockedBadge = daoStakeStorage().readUserLockedBadge(msg.sender);
        uint256 _totalLockedBadges = daoStakeStorage().totalLockedBadges();
        require(_amount > 0);
        _lockedBadge += _amount;
        daoStakeStorage().updateUserBadgeStake(msg.sender, _lockedBadge);
        daoStakeStorage().updateTotalLockedBadges(_totalLockedBadges + _amount);

        daoStakeStorage().addBadgeParticipant(msg.sender);
        // interaction happens last
        require(ERC20(ADDRESS_DGD_BADGE).transferFrom(msg.sender, address(this), _amount));
        _success = true;
    }

    function withdrawDGD(uint256 _amount)
        public
        if_locking_phase()
        returns (bool _success)
    {
        address _user = msg.sender;
        uint256 _actualLockedDGD;
        uint256 _lockedDGDStake;
        uint256 _totalLockedDGDStake = daoStakeStorage().totalLockedDGDStake();

        (_actualLockedDGD, _lockedDGDStake) = daoStakeStorage().readUserDGDStake(_user);
        require(_actualLockedDGD >= _amount);
        _actualLockedDGD -= _amount;

        if (_actualLockedDGD < CONFIG_MINIMUM_LOCKED_DGD) {
            daoStakeStorage().removeParticipant(_user);
        }
        daoStakeStorage().updateUserDGDStake(_user, _actualLockedDGD, _lockedDGDStake);
        daoStakeStorage().updateTotalLockedDGDStake(_totalLockedDGDStake - _amount);

        require(ERC20(ADDRESS_DGD_TOKEN).transfer(_user, _amount));
        _success = true;
    }

    function withdrawBadge(uint256 _amount)
        public
        if_locking_phase()
        returns (bool _success)
    {
        address _user = msg.sender;
        uint256 _lockedBadge = daoStakeStorage().readUserLockedBadge(_user);
        uint256 _totalLockedBadges = daoStakeStorage().totalLockedBadges();

        require(_lockedBadge >= _amount);
        _lockedBadge -= _amount;
        daoStakeStorage().updateUserBadgeStake(_user, _lockedBadge);
        daoStakeStorage().updateTotalLockedBadges(_totalLockedBadges - _amount);

        if (_lockedBadge == 0) {
            daoStakeStorage().removeBadgeParticipant(_user);
        }
        // interaction happens last
        require(ERC20(ADDRESS_DGD_BADGE).transfer(_user, _amount));
        _success = true;
    }

    // to be removed, only for test purpose
    function isLockingPhase()
        public
        if_locking_phase()
        returns (bool _success)
    {
        _success = true;
    }

    // to be removed, only for test purpose
    function isMainPhase()
        public
        if_main_phase()
        returns (bool _success)
    {
        _success = true;
    }
}
