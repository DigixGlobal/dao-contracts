pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import "./lib/MathHelper.sol";
import "./common/DaoCommon.sol";

contract StakeLocking is DaoCommon {

    function StakeLocking(address _resolver) public {
        require(init(CONTRACT_STAKE_LOCKING, _resolver));
    }

    function lockDGD(uint256 _amount) public {
        address _user = msg.sender;
        uint256 _actualLockedDGD;
        uint256 _lockedDGDStake;
        (_actualLockedDGD, _lockedDGDStake) = stakeStorage().readUserDGDStake(_user);

        require(_amount > 0);
        _actualLockedDGD += _amount;
        // TODO: calculate this properly
        _lockedDGDStake += _amount;
        stakeStorage().updateUserDGDStake(_user, _actualLockedDGD, _lockedDGDStake);
        if (_actualLockedDGD >= CONFIG_MINIMUM_LOCKED_DGD) {
            stakeStorage().addParticipant(_user);
        }

        // interaction happens last
        require(ERC20(ADDRESS_DGD_TOKEN).transferFrom(_user, address(this), _amount));
    }

    function lockBadge(uint256 _amount)
        public
        if_locking_phase()
    {
        address _user = msg.sender;
        uint256 _lockedBadge = stakeStorage().readUserLockedBadge(_user);
        require(_amount > 0);
        _lockedBadge += _amount;
        stakeStorage().updateUserBadgeStake(_user, _lockedBadge);

        stakeStorage().addBadgeParticipant(_user);
        // interaction happens last
        require(ERC20(ADDRESS_DGD_BADGE).transferFrom(_user, address(this), _amount));
    }

    function withdrawDGD(uint256 _amount)
        public
        if_locking_phase()
    {
        address _user = msg.sender;
        uint256 _actualLockedDGD;
        uint256 _lockedDGDStake;
        (_actualLockedDGD, _lockedDGDStake) = stakeStorage().readUserDGDStake(_user);
        require(_actualLockedDGD >= _amount);
        _actualLockedDGD -= _amount;

        if (_actualLockedDGD < CONFIG_MINIMUM_LOCKED_DGD) {
            stakeStorage().removeParticipant(_user);
        }
        stakeStorage().updateUserDGDStake(_user, _actualLockedDGD, _lockedDGDStake);

        require(ERC20(ADDRESS_DGD_TOKEN).transfer(_user, _amount));
    }

    function withdrawBadge(uint256 _amount)
        public
        if_locking_phase()
    {
        address _user = msg.sender;
        uint256 _lockedBadge = stakeStorage().readUserLockedBadge(_user);
        require(_lockedBadge >= _amount);
        _lockedBadge -= _amount;
        stakeStorage().updateUserBadgeStake(_user, _lockedBadge);

        if (_lockedBadge == 0) {
            stakeStorage().removeBadgeParticipant(_user);
        }
        // interaction happens last
        require(ERC20(ADDRESS_DGD_BADGE).transfer(_user, _amount));
    }
}
