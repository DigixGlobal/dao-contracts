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
    event LockDGD(address _user, uint256 _amount, uint256 _currentLockedDGDStake);
    event WithdrawDGD(address _user, uint256 _amount);

    address public dgdToken;
    address public dgdBadgeToken;

    // carbonVoting1 refers to this carbon vote: https://digix.global/carbonvote/1/#/
    // the contract is at: https://etherscan.io/address/0x9f56f330bceb9d4e756be94581298673e94ed592#code
    address public carbonVoting1;

    // carbonVoting2 refers to this carbon vote: https://digix.global/carbonvote/2/#/
    // the contract is at: https://etherscan.io/address/0xdec6c0dc7004ba23940c9ee7cb4a0528ec4c0580#code
    address public carbonVoting2;

    // The two carbon votes implement the NumberCarbonVoting interface, which has a voted(address) function to find out
    // whether an address has voted in the carbon vote.
    // Addresses will be awarded a fixed amount of Reputation Point (CONFIG_CARBON_VOTE_REPUTATION_BONUS) for every carbon votes that they participated in

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


    /**
    @notice Function to convert a DGD Badge to Reputation Points
    @dev The Badge holder can redeem the Badge anytime in the first quarter, or
         Otherwise, the participant must either lock/withdraw/continue in the current quarter first, before he can redeem a badge
         Only 1 DGD Badge is accepted from an address, so holders with multiple badges
         should either sell their other badges or redeem reputation to another address
    */
    function redeemBadge()
        public
    {
        // should not have redeemed a badge
        require(!daoStakeStorage().redeemedBadge(msg.sender));

        // Can only redeem a badge if the reputation has been updated to the previous quarter.
        // In other words, this holder must have called either lockDGD/withdrawDGD/confirmContinuedParticipation in this quarter (hence, rewards for last quarter was already calculated)
        // This is to prevent users from changing the Reputation point that would be used to calculate their rewards for the previous quarter.

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

    function lockDGD(uint256 _amount) public {
        require(_amount > 0);
        lockDGDInternal(_amount);
    }


    /**
    @notice Function to lock DGD tokens to participate in the DAO
    @dev Users must `approve` the DaoStakeLocking contract to transfer DGDs from them
         Contracts are not allowed to participate in DigixDAO
    @param _amount Amount of DGDs to lock
    */
    function lockDGDInternal(uint256 _amount)
        internal
        ifNotContract(msg.sender)
        ifGlobalRewardsSet(currentQuarterIndex())
    {
        StakeInformation memory _info = getStakeInformation(msg.sender);
        StakeInformation memory _newInfo = refreshDGDStake(msg.sender, _info);

        uint256 _additionalStake = 0;
        if (_amount > 0) _additionalStake = daoCalculatorService().calculateAdditionalLockedDGDStake(_amount);

        _newInfo.userActualLockedDGD = _newInfo.userActualLockedDGD.add(_amount);
        _newInfo.userLockedDGDStake = _newInfo.userLockedDGDStake.add(_additionalStake);
        _newInfo.totalLockedDGDStake = _newInfo.totalLockedDGDStake.add(_additionalStake);

        // This has to happen at least once before user can participate in next quarter
        daoRewardsManager().updateRewardsAndReputationBeforeNewQuarter(msg.sender);

        daoStakeStorage().updateUserDGDStake(msg.sender, _newInfo.userActualLockedDGD, _newInfo.userLockedDGDStake);


        //since Reputation is updated, we need to refresh moderator status
        refreshModeratorStatus(msg.sender, _info, _newInfo);

        uint256 _lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(msg.sender);
        uint256 _currentQuarter = currentQuarterIndex();

        // Note: there might be a case when user locked in very small amount A that is less than Minimum locked DGD
        // then, lock again in the middle of the quarter. This will not take into account that A was staked in earlier. Its as if A is only staked in now.
        // Its not ideal, but we will keep it this way.
        if (_newInfo.userLockedDGDStake >= getUintConfig(CONFIG_MINIMUM_LOCKED_DGD)) {
            daoStakeStorage().addToParticipantList(msg.sender); // this will not add a second duplicate of the address if its already there

            // if this is the first time we lock/unlock/continue in this quarter, save the previous lastParticipatedQuarter
            // the purpose of the previousLastParticipatedQuarter is so that, if this participant withdraw all his DGD after locking in,
            // we will revert his lastParticipatedQuarter to the previousLastParticipatedQuarter, so as to not screw up any calculation
            // that uses the lastParticipatedQuarter (for example, for calculating the Reputation penalty for not participating in a number of quarters)
            if (_lastParticipatedQuarter < _currentQuarter) {
                daoRewardsStorage().updatePreviousLastParticipatedQuarter(msg.sender, _lastParticipatedQuarter);
                daoRewardsStorage().updateLastParticipatedQuarter(msg.sender, _currentQuarter);
            }

            // if this is the first time they're locking tokens, ever,
            // reward them with bonus for carbon voting activity
            if (_lastParticipatedQuarter == 0) {
                rewardCarbonVotingBonus(msg.sender);
            }
        } else { // this participant doesnt have enough DGD to be a participant
            // Absolute: The lastParticipatedQuarter of this participant WILL NEVER be the current quarter
            // Otherwise, his lockedDGDStake must be above the CONFIG_MINIMUM_LOCKED_DGDd

            // Hence, the refreshDGDStake() function must have added _newInfo.userLockedDGDStake to _newInfo.totalLockedDGDStake

            // Since this participant is not counted as a participant, we need to deduct _newInfo.userLockedDGDStake from _newInfo.totalLockedDGDStake
            _newInfo.totalLockedDGDStake = _newInfo.totalLockedDGDStake.sub(_newInfo.userLockedDGDStake);
            daoStakeStorage().removeFromParticipantList(msg.sender);
        }

        daoStakeStorage().updateTotalLockedDGDStake(_newInfo.totalLockedDGDStake);

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
    {
        require(isLockingPhase() || daoUpgradeStorage().isReplacedByNewDao()); // If the DAO is already replaced, everyone is free to withdraw their DGDs anytime
        StakeInformation memory _info = getStakeInformation(msg.sender);
        StakeInformation memory _newInfo = refreshDGDStake(msg.sender, _info);

        // This address must have at least some DGDs locked in, to withdraw
        // Otherwise, its meaningless anw
        // This also makes sure that the first participation ever must be a lockDGD() call, to avoid unnecessary complications
        require(_info.userActualLockedDGD > 0);

        require(_info.userActualLockedDGD >= _amount);
        _newInfo.userActualLockedDGD = _newInfo.userActualLockedDGD.sub(_amount);
        _newInfo.userLockedDGDStake = _newInfo.userLockedDGDStake.sub(_amount);
        _newInfo.totalLockedDGDStake = _newInfo.totalLockedDGDStake.sub(_amount);

        //_newInfo.totalLockedDGDStake = _newInfo.totalLockedDGDStake.sub(_amount);

        // This has to happen at least once before user can participate in next quarter
        daoRewardsManager().updateRewardsAndReputationBeforeNewQuarter(msg.sender);

        //since Reputation is updated, we need to refresh moderator status
        refreshModeratorStatus(msg.sender, _info, _newInfo);

        uint256 _lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(msg.sender);
        uint256 _currentQuarter = currentQuarterIndex();

        if (_newInfo.userLockedDGDStake < getUintConfig(CONFIG_MINIMUM_LOCKED_DGD)) { // this participant doesnt have enough DGD to be a participant
            // if this participant has lock/unlock/continue in this quarter before, we need to revert the lastParticipatedQuarter to the previousLastParticipatedQuarter
            if (_lastParticipatedQuarter == _currentQuarter) {
                daoRewardsStorage().updateLastParticipatedQuarter(msg.sender, daoRewardsStorage().previousLastParticipatedQuarter(msg.sender));
            }

            // if this participant is not counted as a participant, the totalLockedDGDStake should not take into account the userLockedDGDStake at all
            _newInfo.totalLockedDGDStake = _newInfo.totalLockedDGDStake.sub(_newInfo.userLockedDGDStake);

            daoStakeStorage().removeFromParticipantList(msg.sender);
        } else { // This participant still remains as a participant
            // if this is the first time we lock/unlock/continue in this quarter, save the previous lastParticipatedQuarter
            if (_lastParticipatedQuarter < _currentQuarter) {
                daoRewardsStorage().updatePreviousLastParticipatedQuarter(msg.sender, _lastParticipatedQuarter);
                daoRewardsStorage().updateLastParticipatedQuarter(msg.sender, _currentQuarter);

            }
            // the totalLockedDGDStake after refreshDGDStake() should decrease by _amount, since this guy withdraws _amount
        }

        daoStakeStorage().updateUserDGDStake(msg.sender, _newInfo.userActualLockedDGD, _newInfo.userLockedDGDStake);
        daoStakeStorage().updateTotalLockedDGDStake(_newInfo.totalLockedDGDStake);

        require(ERC20(dgdToken).transfer(msg.sender, _amount));

        emit WithdrawDGD(msg.sender, _amount);
    }


    /**
    @notice Function to be called by someone who doesnt change their DGDStake for the next quarter to confirm that they're participating
    @dev This can be done in the middle of the quarter as well.
         If someone just lets their DGDs sit in the DAO, and don't call this function, they are not counted as a participant in the quarter.
    */
    function confirmContinuedParticipation()
        public
    {
        lockDGDInternal(0);
    }


    /**
    @notice This function refreshes the DGD stake of a user before doing any staking action(locking/withdrawing/continuing) in a new quarter
    @dev We need to do this because sometimes, the user locked DGDs in the middle of the previous quarter. Hence, his DGDStake in the record now
         is not correct. Note that this function might be called in the middle of the current quarter as well.

        This has no effect if the user has already done some staking action in the current quarter
         _infoBefore has the user's current stake information
         _infoAfter will be the user's stake information after refreshing

         This function updates the totalLockedDGDStake as if, the _user is participating in this quarter
         Therefore, if the _user actually will not qualify as a participant, the caller of this function needs to deduct
         _infoAfter.userLockedDGDStake from _infoAfter.totalLockedDGDStake
    */
    function refreshDGDStake(address _user, StakeInformation _infoBefore)
        internal
        view
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
                _infoAfter.userLockedDGDStake
            );
        }
    }


    /**
    @notice This function refreshes the Moderator status of a user, to be done right after ANY STEP where a user's reputation or DGDStake is changed
    @dev _infoBefore is the stake information of the user before this transaction, _infoAfter is the stake information after this transaction
         This function needs to:
            - add/remove addresses from the moderator list accordingly
            - adjust the totalModeratorLockedDGDStake accordingly as well
    */
    function refreshModeratorStatus(address _user, StakeInformation _infoBefore, StakeInformation _infoAfter)
        internal
    {
        bool _alreadyParticipatedInThisQuarter = daoRewardsStorage().lastParticipatedQuarter(_user) == currentQuarterIndex();
        uint256 _currentTotalModeratorLockedDGDs = daoStakeStorage().totalModeratorLockedDGDStake();

        if (daoStakeStorage().isInModeratorsList(_user) == true) {
            // this participant was already in the moderator list

            if (_infoAfter.userLockedDGDStake < getUintConfig(CONFIG_MINIMUM_DGD_FOR_MODERATOR) ||
                daoPointsStorage().getReputation(_user) < getUintConfig(CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR)) {
                // this participant is no longer a moderator this quarter, should be removed

                // Throw if this is the last moderator. There must be at least one moderator in the moderator list. Otherwise calculateGlobalRewardsBeforeNewQuarter() will fail.
                require(daoStakeStorage().readTotalModerators() > 1);

                daoStakeStorage().removeFromModeratorList(_user);

                // only need to deduct the dgdStake from the totalModeratorLockedDGDStake if this participant has participated in this quarter before this transaction
                if (_alreadyParticipatedInThisQuarter) {
                    daoStakeStorage().updateTotalModeratorLockedDGDs(
                        _currentTotalModeratorLockedDGDs.sub(_infoBefore.userLockedDGDStake)
                    );
                }

            } else { // this moderator was in the moderator list and still remains a moderator now
                if (_alreadyParticipatedInThisQuarter) { // if already participated in this quarter, just account for the difference in dgdStake
                    daoStakeStorage().updateTotalModeratorLockedDGDs(
                        _currentTotalModeratorLockedDGDs.sub(_infoBefore.userLockedDGDStake).add(_infoAfter.userLockedDGDStake)
                    );
                } else { // has not participated in this quarter before this transaction
                    daoStakeStorage().updateTotalModeratorLockedDGDs(
                        _currentTotalModeratorLockedDGDs.add(_infoAfter.userLockedDGDStake)
                    );
                }
            }
        } else { // was not in moderator list
            if (_infoAfter.userLockedDGDStake >= getUintConfig(CONFIG_MINIMUM_DGD_FOR_MODERATOR) &&
                daoPointsStorage().getReputation(_user) >= getUintConfig(CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR)) {

                daoStakeStorage().addToModeratorList(_user);
                daoStakeStorage().updateTotalModeratorLockedDGDs(
                    _currentTotalModeratorLockedDGDs.add(_infoAfter.userLockedDGDStake)
                );
            }
        }
    }


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
        // if the bonus has already been given out once to this user, return
        if (daoStakeStorage().carbonVoteBonusClaimed(_user)) return;

        // for carbon voting 1, if voted, give out a bonus
        if (NumberCarbonVoting(carbonVoting1).voted(_user)) {
            daoPointsStorage().addReputation(_user, getUintConfig(CONFIG_CARBON_VOTE_REPUTATION_BONUS));
        }
        // for carbon voting 2, if voted, give out a bonus
        if (NumberCarbonVoting(carbonVoting2).voted(_user)) {
            daoPointsStorage().addReputation(_user, getUintConfig(CONFIG_CARBON_VOTE_REPUTATION_BONUS));
        }

        // we changed reputation, so we need to update the last quarter that reputation was updated
        // This is to take care of this situation:
        // Holder A locks DGD for the first time in quarter 5, gets some bonus RP for the carbon votes
        // Then, A withdraw all his DGDs right away. Essentially, he's not participating in quarter 5 anymore
        // Now, when he comes back at quarter 10, he should be deducted reputation for 5 quarters that he didnt participated in: from quarter 5 to quarter 9
        daoRewardsStorage().updateLastQuarterThatReputationWasUpdated(msg.sender, currentQuarterIndex().sub(1));

        // set that this user's carbon voting bonus has been given out
        daoStakeStorage().setCarbonVoteBonusClaimed(_user);
    }
}
