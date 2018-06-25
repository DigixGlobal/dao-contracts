pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./lib/MathHelper.sol";
import "./common/DaoCommon.sol";
import "./service/DaoCalculatorService.sol";
import "./DaoRewardsManager.sol";

// @title Contract to handle staking/withdrawing of DGDs for participation in DAO
// @author Digix Holdings
contract DaoStakeLocking is DaoCommon {

    address public dgdToken;
    address public dgdBadgeToken;

    struct StakeInformation {
        uint256 userActualLockedDGD;
        uint256 userLockedDGDStake;
        uint256 totalLockedDGDStake;
    }

    function DaoStakeLocking(address _resolver, address _dgdToken, address _dgdBadgeToken) public {
        require(init(CONTRACT_DAO_STAKE_LOCKING, _resolver));
        dgdToken = _dgdToken;
        dgdBadgeToken = _dgdBadgeToken;
    }

    function daoCalculatorService()
        internal
        returns (DaoCalculatorService _contract)
    {
        _contract = DaoCalculatorService(get_contract(CONTRACT_SERVICE_DAO_CALCULATOR));
    }

    function daoRewardsManager()
        internal
        returns (DaoRewardsManager _contract)
    {
        _contract = DaoRewardsManager(get_contract(CONTRACT_DAO_REWARDS_MANAGER));
    }

    // @notice Function to initially convert DGD Badge to Reputation Points
    // Only 1 DGD Badge is accepted from an address, so multiple badge holders
    // should either sell their other badges or redeem reputation to another address
    function redeemBadge() public {
        require(!daoStakeStorage().redeemedBadge(msg.sender));
        daoStakeStorage().redeemBadge(msg.sender);
        daoPointsStorage().addReputation(msg.sender, get_uint_config(CONFIG_REPUTATION_POINT_BOOST_FOR_BADGE));
        require(ERC20(dgdBadgeToken).transferFrom(msg.sender, address(this), 1));
    }

    // @notice Function to lock DGD tokens to participate in the DAO
    // @dev Users must `approve` the DaoStakeLocking contract to transfer DGDs from them
    // @param _amount Number of DGDs to lock
    // @return _success Boolean, true if the locking process is successful, false otherwise
    function lockDGD(uint256 _amount)
        public
        if_not_contract(msg.sender)
        returns (bool _success)
    {
        StakeInformation memory _info = getStakeInformation(msg.sender);
        StakeInformation memory _newInfo = refreshDGDStake(msg.sender, _info, false);

        require(_amount > 0);
        _newInfo.userActualLockedDGD += _amount;
        uint256 _additionalStake = daoCalculatorService().calculateAdditionalLockedDGDStake(_amount);
        _newInfo.userLockedDGDStake += _additionalStake;
        _newInfo.totalLockedDGDStake += _additionalStake;

        daoStakeStorage().updateUserDGDStake(msg.sender, _newInfo.userActualLockedDGD, _newInfo.userLockedDGDStake);
        daoStakeStorage().updateTotalLockedDGDStake(_newInfo.totalLockedDGDStake);
        refreshModeratorStatus(msg.sender, _info, _newInfo);

        // This has to happen at least once before user can participate in next quarter
        daoRewardsManager().updateRewardsBeforeNewQuarter(msg.sender);

        //TODO: there might be a case when user locked in very small amount A that is less than Minimum locked DGD?
        // then, lock again in the middle of the quarter. This will not take into account that A was staked in earlier
        if (_newInfo.userLockedDGDStake >= CONFIG_MINIMUM_LOCKED_DGD) {
            daoStakeStorage().addToParticipantList(msg.sender);
            daoRewardsStorage().updateLastParticipatedQuarter(msg.sender, currentQuarterIndex());
        }

        // interaction happens last
        require(ERC20(dgdToken).transferFrom(msg.sender, address(this), _amount));
        _success = true;
    }

    // @notice Function to withdraw DGD tokens from this contract (can only be withdrawn in the locking phase of quarter)
    // @param _amount Number of DGD tokens to withdraw
    // @return _success Boolean, true if the withdrawal was successful, revert otherwise
    function withdrawDGD(uint256 _amount)
        public
        if_locking_phase()
        returns (bool _success)
    {
        StakeInformation memory _info = getStakeInformation(msg.sender);
        StakeInformation memory _newInfo = refreshDGDStake(msg.sender, _info, false);

        require(_info.userActualLockedDGD >= _amount);
        _newInfo.userActualLockedDGD -= _amount;
        _newInfo.userLockedDGDStake -= _amount;
        _newInfo.totalLockedDGDStake -= _amount;

        refreshModeratorStatus(msg.sender, _info, _newInfo);
        // This has to happen at least once before user can participate in next quarter
        daoRewardsManager().updateRewardsBeforeNewQuarter(msg.sender);

        if (_newInfo.userLockedDGDStake < CONFIG_MINIMUM_LOCKED_DGD) {
            daoStakeStorage().removeFromParticipantList(msg.sender);
        } else {
            daoRewardsStorage().updateLastParticipatedQuarter(msg.sender, currentQuarterIndex());
        }

        daoStakeStorage().updateUserDGDStake(msg.sender, _newInfo.userActualLockedDGD, _newInfo.userLockedDGDStake);
        daoStakeStorage().updateTotalLockedDGDStake(_newInfo.totalLockedDGDStake);

        require(ERC20(dgdToken).transfer(msg.sender, _amount));
        _success = true;
    }

    // @notice Function to be called by someone who doesnt change their DGDStake for the next quarter to confirm that they're participating
    // @dev This can be done in the middle of the quarter as well
    function confirmContinuedParticipation()
        public
    {
        StakeInformation memory _info = getStakeInformation(msg.sender);
        daoRewardsManager().updateRewardsBeforeNewQuarter(msg.sender);
        StakeInformation memory _infoAfter = refreshDGDStake(msg.sender, _info, true);
        refreshModeratorStatus(msg.sender, _info, _infoAfter);
        daoRewardsStorage().updateLastParticipatedQuarter(msg.sender, currentQuarterIndex());
    }

    // @notice Function to see if it is locking phase
    // @return _success Boolean, true if it is locking phase, revert otherwise
    function isLockingPhase()
        public
        if_locking_phase()
        returns (bool _success)
    {
        _success = true;
    }

    // @notice Function to see if it is main phase
    // @return _success Boolean, true if it is main phase, revert otherwise
    function isMainPhase()
        public
        if_main_phase()
        returns (bool _success)
    {
        _success = true;
    }

    // @notice This function refreshes the DGD stake of a user before continuing participation next quarter
    // has no difference if called in the lastParticipatedQuarter
    function refreshDGDStake(address _user, StakeInformation _infoBefore, bool _saveToStorage)
        internal
        returns (StakeInformation memory _infoAfter)
    {
        _infoAfter.userLockedDGDStake = _infoBefore.userLockedDGDStake;
        _infoAfter.userActualLockedDGD = _infoBefore.userActualLockedDGD;
        _infoAfter.totalLockedDGDStake = _infoBefore.totalLockedDGDStake;

        // only need to refresh if this is the first refresh in this new quarter;
        uint256 _currentQuarter = currentQuarterIndex();
        if (daoRewardsStorage().lastParticipatedQuarter(_user) < _currentQuarter) {
            _infoAfter.userLockedDGDStake = daoCalculatorService().calculateAdditionalLockedDGDStake(_infoBefore.userActualLockedDGD);

            _infoAfter.totalLockedDGDStake += _infoAfter.userLockedDGDStake - _infoBefore.userLockedDGDStake;
            if (_saveToStorage) {
                daoStakeStorage().updateUserDGDStake(_user, _infoAfter.userActualLockedDGD, _infoAfter.userLockedDGDStake);
                daoStakeStorage().updateTotalLockedDGDStake(_infoAfter.totalLockedDGDStake);
            }
        }
    }

    // @notice This function refreshes the Moderator status of a user
    // this takes the refreshed StakeInformation from refreshDGDStake as input
    function refreshModeratorStatus(address _user, StakeInformation _infoBefore, StakeInformation _infoAfter)
        internal
    {
        // remove from moderator list if conditions not satisfied
        if (daoStakeStorage().isInModeratorsList(_user) == true) {

            if (_infoAfter.userLockedDGDStake < CONFIG_MINIMUM_DGD_FOR_MODERATOR ||
                daoPointsStorage().getReputation(_user) < CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR) {

                    daoStakeStorage().removeFromModeratorList(_user);
                    daoStakeStorage().updateTotalModeratorLockedDGDs(daoStakeStorage().totalModeratorLockedDGDStake() - _infoBefore.userLockedDGDStake);
            } else { // update if everything is the same (but may not have locked in locking phase, so actual !== effective)
                daoStakeStorage().updateTotalModeratorLockedDGDs(daoStakeStorage().totalModeratorLockedDGDStake() - _infoBefore.userLockedDGDStake + _infoAfter.userLockedDGDStake);
            }
        } else { // add to moderator list if conditions satisfied
            if (_infoAfter.userLockedDGDStake >= CONFIG_MINIMUM_DGD_FOR_MODERATOR &&
                daoPointsStorage().getReputation(_user) >= CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR) {

                    daoStakeStorage().addToModeratorList(_user);
                    daoStakeStorage().updateTotalModeratorLockedDGDs(daoStakeStorage().totalModeratorLockedDGDStake() + _infoAfter.userLockedDGDStake);
            }
        }
    }

    function getStakeInformation(address _user)
        internal
        returns (StakeInformation _info)
    {
        (_info.userActualLockedDGD, _info.userLockedDGDStake) = daoStakeStorage().readUserDGDStake(_user);
        _info.totalLockedDGDStake = daoStakeStorage().totalLockedDGDStake();
    }
}
