pragma solidity ^0.4.24;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../lib/MathHelper.sol";
import "../common/DaoCommon.sol";
import "../service/DaoCalculatorService.sol";
import "./DaoRewardsManager.sol";
import "./../interface/NumberCarbonVoting.sol";

/**
@title Contract to handle staking/withdrawing of DGDs for participation in DAO
@author Digix Holdings
*/
contract DaoStakeLocking is DaoCommon {

    event RedeemBadge(address _user);
    event LockDGD(address _user, uint256 _amount, uint256 _effectiveAmount);
    event WithdrawDGD(address _user, uint256 _amount);

    address public dgdToken;
    address public dgdBadgeToken;
    address public carbonVoting1;
    address public carbonVoting2;

    struct StakeInformation {
        // this is the amount of DGDs that a user has actualy locked up
        uint256 userActualLockedDGD;

        // this is the DGDStake that the user get from locking up their DGDs.
        // this amount might be smaller than the userActualLockedDGD, because the user has locked some DGDs in the middle of the quarter
        // and those DGDs will not fetch as much DGDStake
        uint256 userLockedDGDStake;

        // this is the sum of everyone's DGD Stake
        uint256 totalLockedDGDStake;
    }

    constructor(
        address _resolver,
        address _dgdToken,
        address _dgdBadgeToken,
        address _carbonVoting1,
        address _carbonVoting2
    ) public {
        require(init(CONTRACT_DAO_STAKE_LOCKING, _resolver));
        dgdToken = _dgdToken;
        dgdBadgeToken = _dgdBadgeToken;
        carbonVoting1 = _carbonVoting1;
        carbonVoting2 = _carbonVoting2;
    }

    function daoCalculatorService()
        internal
        constant
        returns (DaoCalculatorService _contract)
    {
        _contract = DaoCalculatorService(get_contract(CONTRACT_SERVICE_DAO_CALCULATOR));
    }

    function daoRewardsManager()
        internal
        constant
        returns (DaoRewardsManager _contract)
    {
        _contract = DaoRewardsManager(get_contract(CONTRACT_DAO_REWARDS_MANAGER));
    }

    //done
    /**
    @notice Function to convert a DGD Badge to Reputation Points
    @dev The participant must either lock/withdraw/continue in the current quarter first, before he can redeem a badge
         Only 1 DGD Badge is accepted from an address, so holders with multiple badges
         should either sell their other badges or redeem reputation to another address
    */
    function redeemBadge()
        public
    {
        // should not have redeemed a badge
        require(!daoStakeStorage().redeemedBadge(msg.sender));

        // Can only redeem a badge if the reputation has been updated to the previous quarter.
        // In other words, this holder must have called either lockDGD/withdrawDGD/confirmContinuedParticipation in this quarter
        // Note that after lockDGD/withdrawDGD/confirmContinuedParticipation is called, the reputation is always updated to the previous quarter
        require(
            daoRewardsStorage().lastQuarterThatReputationWasUpdated(msg.sender) == (currentQuarterIndex() - 1)
        );

        daoStakeStorage().redeemBadge(msg.sender);
        daoPointsStorage().addReputation(msg.sender, getUintConfig(CONFIG_REPUTATION_POINT_BOOST_FOR_BADGE));

        // update moderator status
        StakeInformation memory _info = getStakeInformation(msg.sender);
        refreshModeratorStatus(msg.sender, _info, _info);

        // transfer the badge to this contract
        require(ERC20(dgdBadgeToken).transferFrom(msg.sender, address(this), 1));

        emit RedeemBadge(msg.sender);
    }

    /**
    @notice Function to lock DGD tokens to participate in the DAO
    @dev Users must `approve` the DaoStakeLocking contract to transfer DGDs from them
         Contracts are not allowed to participate in DigixDAO
    @param _amount Number of DGDs to lock
    */
    function lockDGD(uint256 _amount)
        public
        ifNotContract(msg.sender)
        ifGlobalRewardsSet(currentQuarterIndex())
    {
        StakeInformation memory _info = getStakeInformation(msg.sender);
        StakeInformation memory _newInfo = refreshDGDStake(msg.sender, _info, false);

        require(_amount > 0);
        _newInfo.userActualLockedDGD = _newInfo.userActualLockedDGD.add(_amount);
        uint256 _additionalStake = daoCalculatorService().calculateAdditionalLockedDGDStake(_amount);
        _newInfo.userLockedDGDStake = _newInfo.userLockedDGDStake.add(_additionalStake);
        _newInfo.totalLockedDGDStake = _newInfo.totalLockedDGDStake.add(_additionalStake);

        daoStakeStorage().updateUserDGDStake(msg.sender, _newInfo.userActualLockedDGD, _newInfo.userLockedDGDStake);
        daoStakeStorage().updateTotalLockedDGDStake(_newInfo.totalLockedDGDStake);

        // This has to happen at least once before user can participate in next quarter
        daoRewardsManager().updateRewardsBeforeNewQuarter(msg.sender);

        refreshModeratorStatus(msg.sender, _info, _newInfo);

        uint256 _lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(msg.sender);
        uint256 _currentQuarter = currentQuarterIndex();

        //TODO: there might be a case when user locked in very small amount A that is less than Minimum locked DGD?
        // then, lock again in the middle of the quarter. This will not take into account that A was staked in earlier
        if (_newInfo.userLockedDGDStake >= getUintConfig(CONFIG_MINIMUM_LOCKED_DGD)) {
            daoStakeStorage().addToParticipantList(msg.sender);

            // if this is the first time we lock/unlock/continue in this quarter, save the previous lastParticipatedQuarter
            if (_lastParticipatedQuarter < _currentQuarter) {
                daoRewardsStorage().updatePreviousLastParticipatedQuarter(msg.sender, _lastParticipatedQuarter);
            }

            daoRewardsStorage().updateLastParticipatedQuarter(msg.sender, _currentQuarter);

            // if this is the first time they're locking tokens
            // reward them with bonus for carbon voting activity
            if (_lastParticipatedQuarter == 0) rewardCarbonVotingBonus(msg.sender);
        }

        // interaction happens last
        require(ERC20(dgdToken).transferFrom(msg.sender, address(this), _amount));
        emit LockDGD(msg.sender, _amount, _newInfo.userLockedDGDStake);
    }

    /**
    @notice Function to withdraw DGD tokens from this contract (can only be withdrawn in the locking phase of quarter)
    @param _amount Number of DGD tokens to withdraw
    @return {
      "_success": "Boolean, true if the withdrawal was successful, revert otherwise"
    }
    */
    function withdrawDGD(uint256 _amount)
        public
        ifGlobalRewardsSet(currentQuarterIndex())
        returns (bool _success)
    {
        require(isLockingPhase() || daoUpgradeStorage().isReplacedByNewDao());
        StakeInformation memory _info = getStakeInformation(msg.sender);
        StakeInformation memory _newInfo = refreshDGDStake(msg.sender, _info, false);

        require(_info.userActualLockedDGD >= _amount);
        _newInfo.userActualLockedDGD = _newInfo.userActualLockedDGD.sub(_amount);
        _newInfo.userLockedDGDStake = _newInfo.userLockedDGDStake.sub(_amount);
        _newInfo.totalLockedDGDStake = _newInfo.totalLockedDGDStake.sub(_amount);

        // This has to happen at least once before user can participate in next quarter
        daoRewardsManager().updateRewardsBeforeNewQuarter(msg.sender);

        refreshModeratorStatus(msg.sender, _info, _newInfo);

        uint256 _lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(msg.sender);
        uint256 _currentQuarter = currentQuarterIndex();

        if (_newInfo.userLockedDGDStake < getUintConfig(CONFIG_MINIMUM_LOCKED_DGD)) { // this participant doesnt have enough DGD to be a participant
            // if this participant has lock/unlock/continue in this quarter before, we need to revert the lastParticipatedQuarter to the previousLastParticipatedQuarter
            if (_lastParticipatedQuarter == _currentQuarter) {
                daoRewardsStorage().updateLastParticipatedQuarter(msg.sender, daoRewardsStorage().previousLastParticipatedQuarter(msg.sender));
            }

            daoStakeStorage().removeFromParticipantList(msg.sender);
        } else {
            // if this is the first time we lock/unlock/continue in this quarter, save the previous lastParticipatedQuarter
            if (_lastParticipatedQuarter < _currentQuarter) {
                daoRewardsStorage().updatePreviousLastParticipatedQuarter(msg.sender, _lastParticipatedQuarter);
            }

            daoRewardsStorage().updateLastParticipatedQuarter(msg.sender, _currentQuarter);
        }

        daoStakeStorage().updateUserDGDStake(msg.sender, _newInfo.userActualLockedDGD, _newInfo.userLockedDGDStake);
        daoStakeStorage().updateTotalLockedDGDStake(_newInfo.totalLockedDGDStake);

        require(ERC20(dgdToken).transfer(msg.sender, _amount));
        _success = true;

        emit WithdrawDGD(msg.sender, _amount);
    }

    /**
    @notice Function to be called by someone who doesnt change their DGDStake for the next quarter to confirm that they're participating
    @dev This can be done in the middle of the quarter as well
    */
    function confirmContinuedParticipation()
        public
        ifGlobalRewardsSet(currentQuarterIndex())
    {
        StakeInformation memory _info = getStakeInformation(msg.sender);
        daoRewardsManager().updateRewardsBeforeNewQuarter(msg.sender);
        StakeInformation memory _infoAfter = refreshDGDStake(msg.sender, _info, true);
        refreshModeratorStatus(msg.sender, _info, _infoAfter);

        uint256 _lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(msg.sender);
        uint256 _currentQuarter = currentQuarterIndex();

        // if this is the first time we lock/unlock/continue in this quarter, save the previous lastParticipatedQuarter
        if (_lastParticipatedQuarter < _currentQuarter) {
            daoRewardsStorage().updatePreviousLastParticipatedQuarter(msg.sender, _lastParticipatedQuarter);
        }
        daoRewardsStorage().updateLastParticipatedQuarter(msg.sender, _currentQuarter);
    }

    //done
    /**
    @notice This function refreshes the DGD stake of a user before doing any staking action(locking/withdrawing/continuing) in a new quarter
    @dev We need to do this because sometimes, the user locked DGDs in the middle of the previous quarter. Hence, his DGDStake in the record now
         is not correct. Note that this function might be called in the middle of the current quarter as well.

        This has no effect if the user has already done some staking action in the current quarter
         _infoBefore has the user's current stake information
         _infoAfter will be the user's stake information after refreshing
    */
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

            _infoAfter.totalLockedDGDStake = _infoAfter.totalLockedDGDStake.add(
                _infoAfter.userLockedDGDStake.sub(_infoBefore.userLockedDGDStake)
            );
            if (_saveToStorage) {
                daoStakeStorage().updateUserDGDStake(_user, _infoAfter.userActualLockedDGD, _infoAfter.userLockedDGDStake);
                daoStakeStorage().updateTotalLockedDGDStake(_infoAfter.totalLockedDGDStake);
            }
        }
    }

    //done
    /**
    @notice This function refreshes the Moderator status of a user, to be done right after ANY STEP where a user's reputation or DGDStake is changed
    @dev _infoBefore is the stake information of the user before this transaction, _infoAfter is the stake information after this transaction
         This function needs to adjust the totalModeratorLockedDGDStake accordingly as well
    */
    function refreshModeratorStatus(address _user, StakeInformation _infoBefore, StakeInformation _infoAfter)
        internal
    {
        // remove from moderator list if conditions not satisfied
        if (daoStakeStorage().isInModeratorsList(_user) == true) {

            if (_infoAfter.userLockedDGDStake < getUintConfig(CONFIG_MINIMUM_DGD_FOR_MODERATOR) ||
                daoPointsStorage().getReputation(_user) < getUintConfig(CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR)) {

                    daoStakeStorage().removeFromModeratorList(_user);
                    daoStakeStorage().updateTotalModeratorLockedDGDs(
                        daoStakeStorage().totalModeratorLockedDGDStake().sub(_infoBefore.userLockedDGDStake)
                    );
            } else { // If the moderator status is the same, we still need to update totalModeratorLockedDGDStake if the lockedDGDStake has changed, (e.g. user may not have locked in locking phase, so actual !== effective)
                daoStakeStorage().updateTotalModeratorLockedDGDs(
                    daoStakeStorage().totalModeratorLockedDGDStake().sub(_infoBefore.userLockedDGDStake).add(_infoAfter.userLockedDGDStake)
                );
            }
        } else { // add to moderator list if conditions satisfied
            if (_infoAfter.userLockedDGDStake >= getUintConfig(CONFIG_MINIMUM_DGD_FOR_MODERATOR) &&
                daoPointsStorage().getReputation(_user) >= getUintConfig(CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR)) {

                    daoStakeStorage().addToModeratorList(_user);
                    daoStakeStorage().updateTotalModeratorLockedDGDs(
                        daoStakeStorage().totalModeratorLockedDGDStake().add(_infoAfter.userLockedDGDStake)
                    );
            }
        }
    }

    //done
    /**
    @notice Get the actualLockedDGD and lockedDGDStake of a user, as well as the totalLockedDGDStake of all users
    */
    function getStakeInformation(address _user)
        internal
        constant
        returns (StakeInformation _info)
    {
        (_info.userActualLockedDGD, _info.userLockedDGDStake) = daoStakeStorage().readUserDGDStake(_user);
        _info.totalLockedDGDStake = daoStakeStorage().totalLockedDGDStake();
    }

    /**
    @notice Reward the voters of carbon voting rounds with initial bonus reputation
    @dev This is only called when they're locking tokens for the first time, enough tokens to be a participant
    */
    function rewardCarbonVotingBonus(address _user)
        internal
    {
        if (NumberCarbonVoting(carbonVoting1).voted(_user)) {
            daoPointsStorage().addReputation(_user, getUintConfig(CONFIG_CARBON_VOTE_REPUTATION_BONUS));
        }
        if (NumberCarbonVoting(carbonVoting2).voted(_user)) {
            daoPointsStorage().addReputation(_user, getUintConfig(CONFIG_CARBON_VOTE_REPUTATION_BONUS));
        }
    }
}
