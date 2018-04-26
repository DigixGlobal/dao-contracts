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

        _actualLockedDGD += _amount;
        // TODO: calculate this properly
        _lockedDGDStake += _amount;
        stakeStorage().updateUserDGDStake(_user, _actualLockedDGD, _lockedDGDStake);

        // interaction happens last
        require(ERC20(ADDRESS_DGD_TOKEN).transferFrom(msg.sender, address(this), _amount));
    }

    function lockBadge(uint256 _amount) if_locking_phase public {
        address _user = msg.sender;
        uint256 _lockedBadge = stakeStorage().readUserLockedBadge(_user);
        _lockedBadge += _amount;
        stakeStorage().updateUserBadgeStake(_user, _lockedBadge);

        // interaction happens last
        require(ERC20(ADDRESS_DGD_BADGE).transferFrom(_user, address(this), _amount));
    }

    function withdrawDGD(uint256 _amount) if_locking_phase() public {
        address _user = msg.sender;
        uint256 _actualLockedDGD;
        uint256 _lockedDGDStake;
        (_actualLockedDGD, _lockedDGDStake) = stakeStorage().readUserDGDStake(_user);
        require(_actualLockedDGD >= _amount);
        _actualLockedDGD -= _amount;
        stakeStorage().updateUserDGDStake(_user, _actualLockedDGD, _lockedDGDStake);

        require(ERC20(ADDRESS_DGD_TOKEN).transfer(msg.sender, _amount));
    }
}
