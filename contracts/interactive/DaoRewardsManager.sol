pragma solidity ^0.4.24;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoCommon.sol";
import "../lib/DaoStructs.sol";
import "../service/DaoCalculatorService.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

/**
@title Contract to manage DGX rewards
@author Digix Holdings
*/
contract DaoRewardsManager is DaoCommon {
    using MathHelper for MathHelper;
    using DaoStructs for DaoStructs.DaoQuarterInfo;
    using DaoStructs for DaoStructs.IntermediateResults;

    event StartNewQuarter(uint256 _quarterId);

    address public ADDRESS_DGX_TOKEN;

    struct UserRewards {
        uint256 lastParticipatedQuarter;
        uint256 lastQuarterThatRewardsWasUpdated;
        DaoStructs.DaoQuarterInfo qInfo;
        uint256 effectiveDGDBalance;
        uint256 effectiveModeratorDGDBalance;
    }

    struct QuarterRewardsInfo {
        uint256 previousQuarter;
        uint256 totalEffectiveDGDLastQuarter;
        bool doneCalculatingEffectiveBalance;
        bool doneCalculatingModeratorEffectiveBalance;
        uint256 totalEffectiveModeratorDGDLastQuarter;
        uint256 dgxRewardsPoolLastQuarter;
        DaoStructs.DaoQuarterInfo qInfo;
        address currentUser;
        uint256 userCount;
        uint256 i;
        address[] users;
    }

    function daoCalculatorService()
        internal
        constant
        returns (DaoCalculatorService _contract)
    {
        _contract = DaoCalculatorService(get_contract(CONTRACT_SERVICE_DAO_CALCULATOR));
    }

    /**
    @notice Constructor (set the quarter info for the first quarter)
    @param _resolver Address of the Contract Resolver contract
    @param _dgxAddress Address of the Digix Gold Token contract
    */
    constructor(address _resolver, address _dgxAddress)
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
            get_uint_config(CONFIG_MODERATOR_MINIMAL_QUARTER_POINT),
            get_uint_config(CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR),
            get_uint_config(CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR),
            0,
            now,
            0,
            0
        );
    }

    /**
    @notice Function to claim the DGX rewards allocated to user
    @dev Will revert if _claimableDGX <= MINIMUM_TRANSFER_AMOUNT of DGX
    */
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
        uint256 _days_elapsed = now
            .sub(
                daoRewardsStorage().readDgxDistributionDay(
                    daoRewardsStorage().lastQuarterThatRewardsWasUpdated(_user).add(1)
                )
            )
            .div(1 days);

        _claimableDGX = _claimableDGX.sub(
            daoCalculatorService().calculateDemurrage(
                _claimableDGX,
                _days_elapsed
            ));

        daoRewardsStorage().addToTotalDgxClaimed(_claimableDGX);
        daoRewardsStorage().updateClaimableDGX(_user, 0);
        ERC20(ADDRESS_DGX_TOKEN).transfer(_user, _claimableDGX);
    }

    /**
    @notice Function to update DGX rewards of user while locking/withdrawing DGDs, or continuing participation for new quarter
    @param _user Address of the DAO participant
    */
    function updateRewardsBeforeNewQuarter(address _user)
        public
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        uint256 _currentQuarter = currentQuarterIndex();
        // do nothing if the rewards was already updated for the previous quarter
        if (daoRewardsStorage().lastQuarterThatRewardsWasUpdated(_user).add(1) >= _currentQuarter) {
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
        if (currentQuarterIndex() <= _lastParticipatedQuarter) {
            return;
        }

        if (_lastQuarterThatReputationWasUpdated == _lastParticipatedQuarter.sub(1)) {
            updateRPfromQP(
                _user,
                daoPointsStorage().getQuarterPoint(_user, _lastParticipatedQuarter),
                get_uint_config(CONFIG_MINIMAL_PARTICIPATION_POINT),
                get_uint_config(CONFIG_MAXIMUM_REPUTATION_DEDUCTION),
                get_uint_config(CONFIG_REPUTATION_PER_EXTRA_QP_NUM),
                get_uint_config(CONFIG_REPUTATION_PER_EXTRA_QP_DEN)
            );

            // this user is not a Moderator for current quarter
            // coz this step is done before updating the refreshModerator.
            // But may have been a Moderator before, and if was moderator in their
            // lastParticipatedQuarter, we will find them in the DoublyLinkedList.
            if (daoStakeStorage().isInModeratorsList(_user)) {
                updateRPfromQP(
                    _user,
                    daoPointsStorage().getQuarterModeratorPoint(_user, _lastParticipatedQuarter),
                    get_uint_config(CONFIG_MODERATOR_MINIMAL_QUARTER_POINT),
                    get_uint_config(CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION),
                    get_uint_config(CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM),
                    get_uint_config(CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN)
                );
            }
        }

        _reputationDeduction =
            (currentQuarterIndex().sub(1).sub(MathHelper.max(_lastParticipatedQuarter, _lastQuarterThatReputationWasUpdated)))
            .mul(
                get_uint_config(CONFIG_MAXIMUM_REPUTATION_DEDUCTION)
                .add(get_uint_config(CONFIG_PUNISHMENT_FOR_NOT_LOCKING))
            );

        if (_reputationDeduction > 0) daoPointsStorage().subtractReputation(_user, _reputationDeduction);
        daoRewardsStorage().updateLastQuarterThatReputationWasUpdated(_user, currentQuarterIndex().sub(1));
    }

    function updateRPfromQP (
        address _user,
        uint256 _userQP,
        uint256 _minimalQP,
        uint256 _maxRPDeduction,
        uint256 _rpPerExtraQP_num,
        uint256 _rpPerExtraQP_den
    ) internal {
        uint256 _reputationDeduction;
        uint256 _reputationAddition;
        if (_userQP < _minimalQP) {
            _reputationDeduction =
                _minimalQP.sub(_userQP)
                .mul(_maxRPDeduction)
                .div(_minimalQP);

            daoPointsStorage().subtractReputation(_user, _reputationDeduction);
        } else {
            _reputationAddition =
                _userQP.sub(_minimalQP)
                .mul(_rpPerExtraQP_num)
                .div(_rpPerExtraQP_den);

            daoPointsStorage().addReputation(_user, _reputationAddition);
        }
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
        uint256 _days_elapsed = daoRewardsStorage().readDgxDistributionDay(data.lastParticipatedQuarter.add(1))
            .sub(daoRewardsStorage().readDgxDistributionDay(data.lastQuarterThatRewardsWasUpdated.add(1)))
            .div(1 days);
        _userClaimableDgx = _userClaimableDgx.sub(
            daoCalculatorService().calculateDemurrage(
                _userClaimableDgx,
                _days_elapsed
            )
        );

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

        data.effectiveModeratorDGDBalance = daoCalculatorService().calculateUserEffectiveBalance(
            data.qInfo.moderatorMinimalParticipationPoint,
            data.qInfo.moderatorQuarterPointScalingFactor,
            data.qInfo.moderatorReputationPointScalingFactor,
            daoPointsStorage().getQuarterModeratorPoint(_user, data.lastParticipatedQuarter),
            daoPointsStorage().getReputation(_user),
            daoStakeStorage().lockedDGDStake(_user)
        );

        if (daoRewardsStorage().readTotalEffectiveDGDLastQuarter(data.lastParticipatedQuarter.add(1)) > 0) {
            _userClaimableDgx = _userClaimableDgx.add(
                data.effectiveDGDBalance
                .mul(daoRewardsStorage().readRewardsPoolOfLastQuarter(
                    data.lastParticipatedQuarter.add(1)
                ))
                .mul(
                    get_uint_config(CONFIG_PORTION_TO_BADGE_HOLDERS_DEN)
                    .sub(get_uint_config(CONFIG_PORTION_TO_BADGE_HOLDERS_NUM))
                )
                .div(daoRewardsStorage().readTotalEffectiveDGDLastQuarter(
                    data.lastParticipatedQuarter.add(1)
                ))
                .div(get_uint_config(CONFIG_PORTION_TO_BADGE_HOLDERS_DEN))
            );
        }

        if (daoRewardsStorage().readTotalEffectiveModeratorDGDLastQuarter(data.lastParticipatedQuarter.add(1)) > 0) {
            _userClaimableDgx = _userClaimableDgx.add(
                data.effectiveModeratorDGDBalance
                .mul(daoRewardsStorage().readRewardsPoolOfLastQuarter(
                    data.lastParticipatedQuarter.add(1)
                ))
                .mul(
                     get_uint_config(CONFIG_PORTION_TO_BADGE_HOLDERS_NUM)
                )
                .div(daoRewardsStorage().readTotalEffectiveModeratorDGDLastQuarter(
                    data.lastParticipatedQuarter.add(1)
                ))
                .div(get_uint_config(CONFIG_PORTION_TO_BADGE_HOLDERS_DEN))
            );
        }

        // update claimableDGXs. The calculation needs to take into account demurrage since the
        // dgxDistributionDay of the last quarter as well
        daoRewardsStorage().updateClaimableDGX(_user, _userClaimableDgx);

        // update lastQuarterThatRewardsWasUpdated
        daoRewardsStorage().updateLastQuarterThatRewardsWasUpdated(_user, data.lastParticipatedQuarter);
        _valid = true;
    }

    /**
    @notice Function called by the founder after transfering the DGX fees into the DAO at the beginning of the quarter
    */
    function calculateGlobalRewardsBeforeNewQuarter(uint256 _operations)
        if_founder()
        public
        returns (bool _done)
    {
        require(isDaoNotReplaced());
        require(isLockingPhase());
        QuarterRewardsInfo memory info;
        info.previousQuarter = currentQuarterIndex().sub(1);
        require(info.previousQuarter > 0); // throw if this is the first quarter
        info.qInfo = readQuarterInfo(info.previousQuarter);

        DaoStructs.IntermediateResults memory interResults;
        (
            interResults.countedUntil,,,,
            info.totalEffectiveDGDLastQuarter
        ) = intermediateResultsStorage().getIntermediateResults(keccak256(abi.encodePacked(INTERMEDIATE_DGD_IDENTIFIER, info.previousQuarter)));

        _operations = sumEffectiveBalance(info, false, _operations, interResults);
        if (!info.doneCalculatingEffectiveBalance) { return false; }

        (
            interResults.countedUntil,,,,
            info.totalEffectiveModeratorDGDLastQuarter
        ) = intermediateResultsStorage().getIntermediateResults(keccak256(abi.encodePacked(INTERMEDIATE_MODERATOR_DGD_IDENTIFIER, info.previousQuarter)));

        sumEffectiveBalance(info, true, _operations, interResults);
        if (!info.doneCalculatingModeratorEffectiveBalance) { return false; }
        // save the quarter Info
        processGlobalRewardsUpdate(info);
        _done = true;

        emit StartNewQuarter(currentQuarterIndex());
    }

    function processGlobalRewardsUpdate(QuarterRewardsInfo memory info) internal {
        // calculate how much DGX rewards we got for this quarter
        info.dgxRewardsPoolLastQuarter =
            ERC20(ADDRESS_DGX_TOKEN).balanceOf(address(this))
            .add(daoRewardsStorage().totalDGXsClaimed())
            .sub(info.qInfo.sumRewardsFromBeginning);

        daoRewardsStorage().updateQuarterInfo(
            info.previousQuarter.add(1),
            get_uint_config(CONFIG_MINIMAL_PARTICIPATION_POINT),
            get_uint_config(CONFIG_QUARTER_POINT_SCALING_FACTOR),
            get_uint_config(CONFIG_REPUTATION_POINT_SCALING_FACTOR),
            info.totalEffectiveDGDLastQuarter,

            get_uint_config(CONFIG_MODERATOR_MINIMAL_QUARTER_POINT),
            get_uint_config(CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR),
            get_uint_config(CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR),
            info.totalEffectiveModeratorDGDLastQuarter,

            now,
            info.dgxRewardsPoolLastQuarter,
            info.qInfo.sumRewardsFromBeginning.add(info.dgxRewardsPoolLastQuarter)
        );
    }

    function sumEffectiveBalance (
        QuarterRewardsInfo memory info,
        bool _badgeCalculation,
        uint256 _operations,
        DaoStructs.IntermediateResults memory _interResults
    )
        internal
        returns (uint _operationsLeft)
    {
        if (_operations == 0) return _operations;

        if (_interResults.countedUntil == EMPTY_ADDRESS) {
            info.users = _badgeCalculation ?
                daoListingService().listModerators(_operations, true)
                : daoListingService().listParticipants(_operations, true);
        } else {
            info.users = _badgeCalculation ?
                daoListingService().listModeratorsFrom(_interResults.countedUntil, _operations, true)
                : daoListingService().listParticipantsFrom(_interResults.countedUntil, _operations, true);

            // if the address is the already the last, it means this is the first step, and its already done;
            if (info.users.length == 0) {
                info.doneCalculatingEffectiveBalance = true;
                return _operations;
            }
        }

        address _lastAddress;
        _lastAddress = info.users[info.users.length - 1];

        info.userCount = info.users.length;
        for (info.i=0;info.i<info.userCount;info.i++) {
            info.currentUser = info.users[info.i];
            // check if this participant really did participate in the previous quarter
            if (daoRewardsStorage().lastParticipatedQuarter(info.currentUser) < info.previousQuarter) {
                continue;
            }
            if (_badgeCalculation) {
                info.totalEffectiveModeratorDGDLastQuarter = info.totalEffectiveModeratorDGDLastQuarter.add(daoCalculatorService().calculateUserEffectiveBalance(
                    info.qInfo.moderatorMinimalParticipationPoint,
                    info.qInfo.moderatorQuarterPointScalingFactor,
                    info.qInfo.moderatorReputationPointScalingFactor,
                    daoPointsStorage().getQuarterModeratorPoint(info.currentUser, info.previousQuarter),
                    daoPointsStorage().getReputation(info.currentUser),
                    daoStakeStorage().lockedDGDStake(info.currentUser)
                ));
            } else {
                info.totalEffectiveDGDLastQuarter = info.totalEffectiveDGDLastQuarter.add(daoCalculatorService().calculateUserEffectiveBalance(
                    info.qInfo.minimalParticipationPoint,
                    info.qInfo.quarterPointScalingFactor,
                    info.qInfo.reputationPointScalingFactor,
                    daoPointsStorage().getQuarterPoint(info.currentUser, info.previousQuarter),
                    daoPointsStorage().getReputation(info.currentUser),
                    daoStakeStorage().lockedDGDStake(info.currentUser)
                ));
            }
        }

        // check if we have reached the last guy in the current list
        if (_lastAddress == daoStakeStorage().readLastModerator() && _badgeCalculation) {
            info.doneCalculatingModeratorEffectiveBalance = true;
        }
        if (_lastAddress == daoStakeStorage().readLastParticipant() && !_badgeCalculation) {
            info.doneCalculatingEffectiveBalance = true;
        }
        intermediateResultsStorage().setIntermediateResults(
            keccak256(abi.encodePacked(_badgeCalculation ? INTERMEDIATE_MODERATOR_DGD_IDENTIFIER : INTERMEDIATE_DGD_IDENTIFIER, info.previousQuarter)),
            _lastAddress,
            0,0,0,
            _badgeCalculation ? info.totalEffectiveModeratorDGDLastQuarter : info.totalEffectiveDGDLastQuarter
        );

        _operationsLeft = _operations.sub(info.userCount);
    }

    function readQuarterInfo(uint256 _quarterIndex)
        internal
        constant
        returns (DaoStructs.DaoQuarterInfo _qInfo)
    {
        (
            _qInfo.minimalParticipationPoint,
            _qInfo.quarterPointScalingFactor,
            _qInfo.reputationPointScalingFactor,
            _qInfo.totalEffectiveDGDLastQuarter
        ) = daoRewardsStorage().readQuarterParticipantInfo(_quarterIndex);
        (
            _qInfo.moderatorMinimalParticipationPoint,
            _qInfo.moderatorQuarterPointScalingFactor,
            _qInfo.moderatorReputationPointScalingFactor,
            _qInfo.totalEffectiveModeratorDGDLastQuarter
        ) = daoRewardsStorage().readQuarterModeratorInfo(_quarterIndex);
        (
            _qInfo.dgxDistributionDay,
            _qInfo.dgxRewardsPoolLastQuarter,
            _qInfo.sumRewardsFromBeginning
        ) = daoRewardsStorage().readQuarterGeneralInfo(_quarterIndex);
    }
}
