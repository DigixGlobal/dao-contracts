pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import "./lib/MathHelper.sol";
import "./common/DaoCommon.sol";

contract DaoStakeLocking is DaoCommon {

    function DaoStakeLocking(address _resolver) public {
        require(init(CONTRACT_DAO_STAKE_LOCKING, _resolver));
    }

    function lockDGD(uint256 _amount) public {
        address _user = msg.sender;
        uint256 _actualLockedDGD;
        uint256 _lockedDGDStake;
        (_actualLockedDGD, _lockedDGDStake) = daoStakeStorage().readUserDGDStake(_user);

        require(_amount > 0);
        _actualLockedDGD += _amount;
        // TODO: calculate this properly
        _lockedDGDStake += _amount;
        daoStakeStorage().updateUserDGDStake(_user, _actualLockedDGD, _lockedDGDStake);
        if (_actualLockedDGD >= CONFIG_MINIMUM_LOCKED_DGD) {
            daoStakeStorage().addParticipant(_user);
        }

        // interaction happens last
        require(ERC20(ADDRESS_DGD_TOKEN).transferFrom(_user, address(this), _amount));
    }

    function lockBadge(uint256 _amount)
        public
        if_locking_phase()
    {
        address _user = msg.sender;
        uint256 _lockedBadge = daoStakeStorage().readUserLockedBadge(_user);
        require(_amount > 0);
        _lockedBadge += _amount;
        daoStakeStorage().updateUserBadgeStake(_user, _lockedBadge);

        daoStakeStorage().addBadgeParticipant(_user);
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
        (_actualLockedDGD, _lockedDGDStake) = daoStakeStorage().readUserDGDStake(_user);
        require(_actualLockedDGD >= _amount);
        _actualLockedDGD -= _amount;

        if (_actualLockedDGD < CONFIG_MINIMUM_LOCKED_DGD) {
            daoStakeStorage().removeParticipant(_user);
        }
        daoStakeStorage().updateUserDGDStake(_user, _actualLockedDGD, _lockedDGDStake);

        require(ERC20(ADDRESS_DGD_TOKEN).transfer(_user, _amount));
    }

    function withdrawBadge(uint256 _amount)
        public
        if_locking_phase()
    {
        address _user = msg.sender;
        uint256 _lockedBadge = daoStakeStorage().readUserLockedBadge(_user);
        require(_lockedBadge >= _amount);
        _lockedBadge -= _amount;
        daoStakeStorage().updateUserBadgeStake(_user, _lockedBadge);

        if (_lockedBadge == 0) {
            daoStakeStorage().removeBadgeParticipant(_user);
        }
        // interaction happens last
        require(ERC20(ADDRESS_DGD_BADGE).transfer(_user, _amount));
    }
}
