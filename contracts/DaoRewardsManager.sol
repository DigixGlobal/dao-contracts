pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./common/DaoCommon.sol";
import "./lib/DaoStructs.sol";
import "./service/DaoCalculatorService.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

// @title Contract to manage DGX rewards
// @author Digix Holdings
contract DaoRewardsManager is DaoCommon {
    using MathHelper for MathHelper;
    using DaoStructs for DaoStructs.DaoQuarterInfo;

    address public ADDRESS_DGX_TOKEN;

    struct UserRewards {
        uint256 lastParticipatedQuarter;
        uint256 lastQuarterThatRewardsWasUpdated;
        DaoStructs.DaoQuarterInfo qInfo;
        uint256 effectiveDGDBalance;
        uint256 effectiveBadgeBalance;
    }

    struct QuarterRewardsInfo {
        uint256 previousQuarter;
        uint256 totalEffectiveDGDLastQuarter;
        uint256 totalEffectiveBadgesLastQuarter;
        uint256 dgxRewardsPoolLastQuarter;
        DaoStructs.DaoQuarterInfo qInfo;
        address currentUser;
        uint256 userCount;
        uint256 i;
        address[] users;
    }

    // @notice Constructor (set the quarter info for the first quarter)
    // @param _resolver Address of the Contract Resolver contract
    // @param _dgxAddress Address of the Digix Gold Token contract
    function DaoRewardsManager(address _resolver, address _dgxAddress)
        public
    {
        require(init(CONTRACT_DAO_REWARDS_MANAGER, _resolver));
        ADDRESS_DGX_TOKEN = _dgxAddress;
        daoRewardsStorage().updateQuarterInfo(
            1,
            get_uint_config(CONFIG_MINIMAL_PARTICIPATION_POINT),
            get_uint_config(CONFIG_QUARTER_POINT_SCALING_FACTOR),
            get_uint_config(CONFIG_REPUTATION_POINT_SCALING_FACTOR),
            0,
            get_uint_config(CONFIG_MINIMAL_BADGE_PARTICIPATION_POINT),
            get_uint_config(CONFIG_BADGE_QUARTER_POINT_SCALING_FACTOR),
            get_uint_config(CONFIG_BADGE_REPUTATION_POINT_SCALING_FACTOR),
            0,
            now,
            0,
            0
        );
    }

    function daoCalculatorService()
        internal
        returns (DaoCalculatorService _contract)
    {
        _contract = DaoCalculatorService(get_contract(CONTRACT_SERVICE_DAO_CALCULATOR));
    }

    // @notice Function to claim the DGX rewards allocated to user
    // @dev Will revert if _claimableDGX <= MINIMUM_TRANSFER_AMOUNT of DGX
    function claimRewards()
        public
    {
        address _user = msg.sender;
        uint256 _claimableDGX;

        // update rewards for the quarter that he last participated in
        (, _claimableDGX) = calculateUserRewardsLastQuarter(_user);

        // withdraw from his claimableDGXs
        // This has to take into account demurrage
        // Basically, the value of claimableDGXs in the contract is for the dgxDistributionDay of (lastParticipatedQuarter + 1)
        _claimableDGX -= daoCalculatorService().calculateDemurrage(
            _claimableDGX,
            (now - daoRewardsStorage().readDgxDistributionDay(
                daoRewardsStorage().lastQuarterThatRewardsWasUpdated(_user) + 1
            )) / (1 days)
        );

        daoRewardsStorage().addToTotalDgxClaimed(_claimableDGX);
        daoRewardsStorage().updateClaimableDGX(_user, 0);
        ERC20(ADDRESS_DGX_TOKEN).transfer(_user, _claimableDGX);
    }

    // @notice Function to update DGX rewards of user while locking/withdrawing DGDs, or continuing participation for new quarter
    // @param _user Address of the DAO participant
    function updateRewardsBeforeNewQuarter(address _user)
        public
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
    {
        uint256 _currentQuarter = currentQuarterIndex();
        // do nothing if the rewards was already updated for the previous quarter
        if (daoRewardsStorage().lastQuarterThatRewardsWasUpdated(_user) + 1 >= _currentQuarter) {
            return;
        }
        calculateUserRewardsLastQuarter(_user);
        calculateUserReputationLastQuarter(_user);
    }

    function calculateUserReputationLastQuarter (address _user)
        private
    {
        uint256 _lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(_user);
        uint256 _lastQuarterThatReputationWasUpdated = daoRewardsStorage().lastQuarterThatReputationWasUpdated(_user);
        uint256 _reputationDeduction;
        uint256 _reputationAddition;
        if (currentQuarterIndex() <= _lastParticipatedQuarter) {
            return;
        }

        if (_lastParticipatedQuarter > _lastQuarterThatReputationWasUpdated) {
            uint256 _userQP = daoPointsStorage().getQuarterPoint(_user, _lastParticipatedQuarter);

            if (_userQP < get_uint_config(CONFIG_MINIMAL_PARTICIPATION_POINT)) {
                _reputationDeduction =
                    (get_uint_config(CONFIG_MINIMAL_PARTICIPATION_POINT) - _userQP)
                    * get_uint_config(CONFIG_MAXIMUM_REPUTATION_DEDUCTION)
                    / get_uint_config(CONFIG_MINIMAL_PARTICIPATION_POINT);

                daoPointsStorage().subtractReputation(_user, _reputationDeduction);
            } else {
                _reputationAddition =
                    (_userQP - get_uint_config(CONFIG_MINIMAL_PARTICIPATION_POINT)) *
                    get_uint_config(CONFIG_REPUTATION_PER_EXTRA_QP_NUM) /
                    get_uint_config(CONFIG_REPUTATION_PER_EXTRA_QP_DEN);

                daoPointsStorage().addReputation(_user, _reputationAddition);
            }
        } else {
            _reputationDeduction =
                (currentQuarterIndex() - 1 - _lastParticipatedQuarter) *
                (get_uint_config(CONFIG_MAXIMUM_REPUTATION_DEDUCTION) + get_uint_config(CONFIG_PUNISHMENT_FOR_NOT_LOCKING));

            daoPointsStorage().subtractReputation(_user, _reputationDeduction);
        }
        daoRewardsStorage().updateLastQuarterThatReputationWasUpdated(_user, _lastParticipatedQuarter);
    }

    function calculateUserRewardsLastQuarter(address _user)
        private
        returns (bool _valid, uint256 _userClaimableDgx)
    {
        UserRewards memory data;
        // the last participating quarter must be:
        // - over
        // - after the lastQuarterThatRewardsWasUpdated
        data.lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(_user);
        data.lastQuarterThatRewardsWasUpdated = daoRewardsStorage().lastQuarterThatRewardsWasUpdated(_user);

        _userClaimableDgx = daoRewardsStorage().claimableDGXs(_user);
        if (currentQuarterIndex() <= data.lastParticipatedQuarter || data.lastParticipatedQuarter <= data.lastQuarterThatRewardsWasUpdated) {
            return (false, _userClaimableDgx);
        }

        // now we will calculate the user rewards based on info of the data.lastParticipatedQuarter
        data.qInfo = readQuarterInfo(data.lastParticipatedQuarter);

        // now we "deduct the demurrage" from the claimable DGXs for time period from
        // dgxDistributionDay of lastQuarterThatRewardsWasUpdated + 1 to dgxDistributionDay of lastParticipatedQuarter + 1
        _userClaimableDgx -= daoCalculatorService().calculateDemurrage(
            _userClaimableDgx,
            (daoRewardsStorage().readDgxDistributionDay(data.lastParticipatedQuarter + 1)
            - daoRewardsStorage().readDgxDistributionDay(data.lastQuarterThatRewardsWasUpdated + 1))
            / (1 days) );

        // RP has been updated at the beginning of the lastParticipatedQuarter in
        // a call to updateRewardsBeforeNewQuarter();

        // calculate dgx rewards; This is basically the DGXs that user can withdraw on the dgxDistributionDay of the last participated quarter
        // when user actually withdraw some time after that, he will be deducted demurrage.

        data.effectiveDGDBalance = daoCalculatorService().calculateUserEffectiveBalance(
            data.qInfo.minimalParticipationPoint,
            data.qInfo.quarterPointScalingFactor,
            data.qInfo.reputationPointScalingFactor,
            daoPointsStorage().getQuarterPoint(_user, data.lastParticipatedQuarter),
            daoPointsStorage().getReputation(_user),
            daoStakeStorage().lockedDGDStake(_user)
        );

        data.effectiveBadgeBalance = daoCalculatorService().calculateUserEffectiveBalance(
            data.qInfo.badgeMinimalParticipationPoint,
            data.qInfo.badgeQuarterPointScalingFactor,
            data.qInfo.badgeReputationPointScalingFactor,
            daoPointsStorage().getQuarterModeratorPoint(_user, data.lastParticipatedQuarter),
            daoPointsStorage().getReputation(_user),
            daoStakeStorage().lockedDGDStake(_user)
        );

        if (daoRewardsStorage().readTotalEffectiveDGDLastQuarter(data.lastParticipatedQuarter + 1) > 0) {
          _userClaimableDgx += data.effectiveDGDBalance *
              daoRewardsStorage().readRewardsPoolOfLastQuarter(data.lastParticipatedQuarter + 1)
              * (get_uint_config(CONFIG_PORTION_TO_BADGE_HOLDERS_DEN) - get_uint_config(CONFIG_PORTION_TO_BADGE_HOLDERS_NUM))
              / daoRewardsStorage().readTotalEffectiveDGDLastQuarter(data.lastParticipatedQuarter + 1)
              / get_uint_config(CONFIG_PORTION_TO_BADGE_HOLDERS_DEN);
        }

        if (daoRewardsStorage().readTotalEffectiveBadgeLastQuarter(data.lastParticipatedQuarter + 1) > 0) {
          _userClaimableDgx += data.effectiveBadgeBalance *
              daoRewardsStorage().readRewardsPoolOfLastQuarter(data.lastParticipatedQuarter + 1)
              * get_uint_config(CONFIG_PORTION_TO_BADGE_HOLDERS_NUM)
              / daoRewardsStorage().readTotalEffectiveBadgeLastQuarter(data.lastParticipatedQuarter + 1)
              / get_uint_config(CONFIG_PORTION_TO_BADGE_HOLDERS_DEN);
        }

        // update claimableDGXs. The calculation needs to take into account demurrage since the
        // dgxDistributionDay of the last quarter as well
        daoRewardsStorage().updateClaimableDGX(_user, _userClaimableDgx);

        // update lastQuarterThatRewardsWasUpdated
        daoRewardsStorage().updateLastQuarterThatRewardsWasUpdated(_user, data.lastParticipatedQuarter);
        _valid = true;
    }

    // @notice Function called by the founder after transfering the DGX fees into the DAO at the beginning of the quarter
    function calculateGlobalRewardsBeforeNewQuarter()
        if_founder()
        if_locking_phase()
        public
    {
        QuarterRewardsInfo memory info;
        info.previousQuarter = currentQuarterIndex() - 1;
        require(info.previousQuarter > 0); // throw if this is the first quarter

        // go through every participants, calculate their EffectiveDGD balance
        // and add up to get totalEffectiveDGDLastQuarter
        info.qInfo = readQuarterInfo(info.previousQuarter);
        info.userCount = daoStakeStorage().readTotalParticipant();
        info.users = daoListingService().listParticipants(
            info.userCount,
            true
        );
        info.totalEffectiveDGDLastQuarter = sumEffectiveBalance(info, false);

        info.userCount = daoStakeStorage().readTotalModerators();
        info.users = daoListingService().listModerators(
            info.userCount,
            true
        );
        info.totalEffectiveBadgesLastQuarter = sumEffectiveBalance(info, true);

        // calculate how much DGX rewards we got for this quarter
        info.dgxRewardsPoolLastQuarter =
            ERC20(ADDRESS_DGX_TOKEN).balanceOf(address(this))
            + daoRewardsStorage().totalDGXsClaimed()
            - info.qInfo.sumRewardsFromBeginning;

        // save the quarter Info
        daoRewardsStorage().updateQuarterInfo(
            info.previousQuarter + 1,
            get_uint_config(CONFIG_MINIMAL_PARTICIPATION_POINT),
            get_uint_config(CONFIG_QUARTER_POINT_SCALING_FACTOR),
            get_uint_config(CONFIG_REPUTATION_POINT_SCALING_FACTOR),
            info.totalEffectiveDGDLastQuarter,

            get_uint_config(CONFIG_MINIMAL_BADGE_PARTICIPATION_POINT),
            get_uint_config(CONFIG_BADGE_QUARTER_POINT_SCALING_FACTOR),
            get_uint_config(CONFIG_BADGE_REPUTATION_POINT_SCALING_FACTOR),
            info.totalEffectiveBadgesLastQuarter,

            now,
            info.dgxRewardsPoolLastQuarter,
            info.qInfo.sumRewardsFromBeginning + info.dgxRewardsPoolLastQuarter
        );
    }

    function sumEffectiveBalance (
        QuarterRewardsInfo memory info,
        bool _badgeCalculation
    )
        internal
        returns (uint256 _sumOfEffectiveBalance)
    {
        info.userCount = info.users.length;
        for (info.i=0;info.i<info.userCount;info.i++) {
            info.currentUser = info.users[info.i];
            // check if this participant really did participate in the previous quarter
            if (daoRewardsStorage().lastParticipatedQuarter(info.currentUser) < info.previousQuarter) {
                continue;
            }
            if (_badgeCalculation) {
                _sumOfEffectiveBalance += daoCalculatorService().calculateUserEffectiveBalance(
                    info.qInfo.badgeMinimalParticipationPoint,
                    info.qInfo.badgeQuarterPointScalingFactor,
                    info.qInfo.badgeReputationPointScalingFactor,
                    daoPointsStorage().getQuarterModeratorPoint(info.currentUser, info.previousQuarter),
                    daoPointsStorage().getReputation(info.currentUser),
                    daoStakeStorage().lockedDGDStake(info.currentUser)
                );
            } else {
                _sumOfEffectiveBalance += daoCalculatorService().calculateUserEffectiveBalance(
                    info.qInfo.minimalParticipationPoint,
                    info.qInfo.quarterPointScalingFactor,
                    info.qInfo.reputationPointScalingFactor,
                    daoPointsStorage().getQuarterPoint(info.currentUser, info.previousQuarter),
                    daoPointsStorage().getReputation(info.currentUser),
                    daoStakeStorage().lockedDGDStake(info.currentUser)
                );
            }
        }
    }

    // @notice Function to read effective/rewardable balance of user for the previous quarter
    // @param _user Address of the DAO participant
    // @return _effectiveDGDBalance Effective/Rewardable Balance of user
    function getUserEffectiveDGDBalanceLastQuarter(address _user)
        public
        returns (uint256 _effectiveDGDBalance)
    {
        QuarterRewardsInfo memory info;
        info.previousQuarter = currentQuarterIndex() - 1;
        info.qInfo = readQuarterInfo(info.previousQuarter);

        _effectiveDGDBalance = daoCalculatorService().calculateUserEffectiveBalance(
            info.qInfo.minimalParticipationPoint,
            info.qInfo.quarterPointScalingFactor,
            info.qInfo.reputationPointScalingFactor,
            daoPointsStorage().getQuarterPoint(_user, info.previousQuarter),
            daoPointsStorage().getReputation(_user),
            daoStakeStorage().lockedDGDStake(_user)
        );
    }

    // @notice Function to read effective/rewardable balance of user in the previous quarter
    // @param _user Address of the DAO participant
    // @return _effectiveDGDBalance Effective/Rewardable Balance of user
    function getUserEffectiveModeratorBalanceLastQuarter(address _user)
        public
        returns (uint256 _effectiveDGDBalance)
    {
        QuarterRewardsInfo memory info;
        info.previousQuarter = currentQuarterIndex() - 1;
        info.qInfo = readQuarterInfo(info.previousQuarter);

        _effectiveDGDBalance = daoCalculatorService().calculateUserEffectiveBalance(
            info.qInfo.badgeMinimalParticipationPoint,
            info.qInfo.badgeQuarterPointScalingFactor,
            info.qInfo.badgeReputationPointScalingFactor,
            daoPointsStorage().getQuarterModeratorPoint(_user, info.previousQuarter),
            daoPointsStorage().getReputation(_user),
            daoStakeStorage().lockedDGDStake(_user)
        );
    }

    function readQuarterInfo(uint256 _quarterIndex)
        internal
        returns (DaoStructs.DaoQuarterInfo _qInfo)
    {
        (
            _qInfo.minimalParticipationPoint,
            _qInfo.quarterPointScalingFactor,
            _qInfo.reputationPointScalingFactor,
            _qInfo.totalEffectiveDGDLastQuarter,
        ) = daoRewardsStorage().readQuarterParticipantInfo(_quarterIndex);
        (
            _qInfo.badgeMinimalParticipationPoint,
            _qInfo.badgeQuarterPointScalingFactor,
            _qInfo.badgeReputationPointScalingFactor,
            _qInfo.totalEffectiveBadgeLastQuarter,
        ) = daoRewardsStorage().readQuarterBadgeParticipantInfo(_quarterIndex);
        (
            _qInfo.dgxDistributionDay,
            _qInfo.dgxRewardsPoolLastQuarter,
            _qInfo.sumRewardsFromBeginning
        ) = daoRewardsStorage().readQuarterGeneralInfo(_quarterIndex);
    }
}
