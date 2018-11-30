pragma solidity ^0.4.25;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoRewardsManagerCommon.sol";
import "../lib/DaoStructs.sol";
import "../service/DaoCalculatorService.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./DaoRewardsManagerExtras.sol";

/**
@title Contract to manage DGX rewards
@author Digix Holdings
*/
contract DaoRewardsManager is DaoRewardsManagerCommon {
    using MathHelper for MathHelper;
    using DaoStructs for DaoStructs.DaoQuarterInfo;
    using DaoStructs for DaoStructs.IntermediateResults;

    // is emitted when calculateGlobalRewardsBeforeNewQuarter has been done in the beginning of the quarter
    // after which, all the other DAO activities could happen
    event StartNewQuarter(uint256 indexed _quarterNumber);

    address public ADDRESS_DGX_TOKEN;

    function daoCalculatorService()
        internal
        view
        returns (DaoCalculatorService _contract)
    {
        _contract = DaoCalculatorService(get_contract(CONTRACT_SERVICE_DAO_CALCULATOR));
    }

    function daoRewardsManagerExtras()
        internal
        view
        returns (DaoRewardsManagerExtras _contract)
    {
        _contract = DaoRewardsManagerExtras(get_contract(CONTRACT_DAO_REWARDS_MANAGER_EXTRAS));
    }

    /**
    @notice Constructor (set the DaoQuarterInfo struct for the first quarter)
    @param _resolver Address of the Contract Resolver contract
    @param _dgxAddress Address of the Digix Gold Token contract
    */
    constructor(address _resolver, address _dgxAddress)
        public
    {
        require(init(CONTRACT_DAO_REWARDS_MANAGER, _resolver));
        ADDRESS_DGX_TOKEN = _dgxAddress;

        // set the DaoQuarterInfo for the first quarter
        daoRewardsStorage().updateQuarterInfo(
            1,
            getUintConfig(CONFIG_MINIMAL_QUARTER_POINT),
            getUintConfig(CONFIG_QUARTER_POINT_SCALING_FACTOR),
            getUintConfig(CONFIG_REPUTATION_POINT_SCALING_FACTOR),
            0, // totalEffectiveDGDPreviousQuarter, Not Applicable, this value should not be used ever
            getUintConfig(CONFIG_MODERATOR_MINIMAL_QUARTER_POINT),
            getUintConfig(CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR),
            getUintConfig(CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR),
            0, // _totalEffectiveModeratorDGDLastQuarter , Not applicable, this value should not be used ever

            // _dgxDistributionDay, Not applicable, there shouldnt be any DGX rewards in the DAO now. The actual DGX fees that have been collected
            // before the deployment of DigixDAO contracts would be counted as part of the DGX fees incurred in the first quarter
            // this value should not be used ever
            now,

            0, // _dgxRewardsPoolLastQuarter, not applicable, this value should not be used ever
            0 // sumRewardsFromBeginning, which is 0
        );
    }


    /**
    @notice Function to transfer the claimableDGXs to the new DaoRewardsManager
    @dev This is done during the migrateToNewDao procedure
    @param _newDaoRewardsManager Address of the new daoRewardsManager contract
    */
    function moveDGXsToNewDao(address _newDaoRewardsManager)
        public
    {
        require(sender_is(CONTRACT_DAO));
        uint256 _dgxBalance = ERC20(ADDRESS_DGX_TOKEN).balanceOf(address(this));
        ERC20(ADDRESS_DGX_TOKEN).transfer(_newDaoRewardsManager, _dgxBalance);
    }


    /**
    @notice Function for users to claim the claimable DGX rewards
    @dev Will revert if _claimableDGX < MINIMUM_TRANSFER_AMOUNT of DGX.
         Can only be called after calculateGlobalRewardsBeforeNewQuarter() has been called in the current quarter
         This cannot be called once the current version of Dao contracts have been migrated to newer version
    */
    function claimRewards()
        public
        ifGlobalRewardsSet(currentQuarterNumber())
    {
        require(isDaoNotReplaced());

        address _user = msg.sender;
        uint256 _claimableDGX;

        // update rewards for the quarter that he last participated in
        (, _claimableDGX) = updateUserRewardsForLastParticipatingQuarter(_user);

        // withdraw from his claimableDGXs
        // This has to take into account demurrage
        // Basically, the value of claimableDGXs in the contract is for the dgxDistributionDay of (lastParticipatedQuarter + 1)
        // if now is after that, we need to deduct demurrage
        uint256 _days_elapsed = now
            .sub(
                daoRewardsStorage().readDgxDistributionDay(
                    daoRewardsStorage().lastQuarterThatRewardsWasUpdated(_user).add(1) // lastQuarterThatRewardsWasUpdated should be the same as lastParticipatedQuarter now
                )
            )
            .div(1 days);

         // similar logic as in the similar step in updateUserRewardsForLastParticipatingQuarter.
         // it is as if the user has withdrawn all _claimableDGX, and the demurrage is paid back into the DAO immediately
        daoRewardsStorage().addToTotalDgxClaimed(_claimableDGX);

        _claimableDGX = _claimableDGX.sub(
            daoCalculatorService().calculateDemurrage(
                _claimableDGX,
                _days_elapsed
            ));

        daoRewardsStorage().updateClaimableDGX(_user, 0);
        ERC20(ADDRESS_DGX_TOKEN).transfer(_user, _claimableDGX);
        // the _demurrageFees is implicitly "transfered" back into the DAO, and would be counted in the dgxRewardsPool of this quarter (in other words, dgxRewardsPoolLastQuarter of next quarter)
    }


    /**
    @notice Function to update DGX rewards of user. This is only called during locking/withdrawing DGDs, or continuing participation for new quarter
    @param _user Address of the DAO participant
    */
    function updateRewardsAndReputationBeforeNewQuarter(address _user)
        public
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));

        updateUserRewardsForLastParticipatingQuarter(_user);
        updateUserReputationUntilPreviousQuarter(_user);
    }


    // This function would ALWAYS make sure that the user's Reputation Point is updated for ALL activities that has happened
    // BEFORE this current quarter. These activities include:
    //  - Reputation bonus/penalty due to participation in all of the previous quarters
    //  - Reputation penalty for not participating for a few quarters, up until and including the previous quarter
    //  - Badges redemption and carbon vote reputation redemption (that happens in the first time locking)
    // As such, after this function is called on quarter N, the updated reputation point of the user would tentatively be used to calculate the rewards for quarter N
    // Its tentative because the user can also redeem a badge during the period of quarter N to add to his reputation point.
    function updateUserReputationUntilPreviousQuarter (address _user)
        private
    {
        uint256 _lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(_user);
        uint256 _lastQuarterThatReputationWasUpdated = daoRewardsStorage().lastQuarterThatReputationWasUpdated(_user);
        uint256 _reputationDeduction;

        // If the reputation was already updated until the previous quarter
        // nothing needs to be done
        if (
            _lastQuarterThatReputationWasUpdated.add(1) >= currentQuarterNumber()
        ) {
            return;
        }

        // first, we calculate and update the reputation change due to the user's governance activities in lastParticipatedQuarter, if it is not already updated.
        // reputation is not updated for lastParticipatedQuarter yet is equivalent to _lastQuarterThatReputationWasUpdated == _lastParticipatedQuarter - 1
        if (
            (_lastQuarterThatReputationWasUpdated.add(1) == _lastParticipatedQuarter)
        ) {
            updateRPfromQP(
                _user,
                daoPointsStorage().getQuarterPoint(_user, _lastParticipatedQuarter),
                getUintConfig(CONFIG_MINIMAL_QUARTER_POINT),
                getUintConfig(CONFIG_MAXIMUM_REPUTATION_DEDUCTION),
                getUintConfig(CONFIG_REPUTATION_PER_EXTRA_QP_NUM),
                getUintConfig(CONFIG_REPUTATION_PER_EXTRA_QP_DEN)
            );

            // this user is not a Moderator for current quarter
            // coz this step is done before updating the refreshModerator.
            // But may have been a Moderator before, and if was moderator in their
            // lastParticipatedQuarter, we will find them in the DoublyLinkedList.
            if (daoStakeStorage().isInModeratorsList(_user)) {
                updateRPfromQP(
                    _user,
                    daoPointsStorage().getQuarterModeratorPoint(_user, _lastParticipatedQuarter),
                    getUintConfig(CONFIG_MODERATOR_MINIMAL_QUARTER_POINT),
                    getUintConfig(CONFIG_MAXIMUM_MODERATOR_REPUTATION_DEDUCTION),
                    getUintConfig(CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_NUM),
                    getUintConfig(CONFIG_REPUTATION_PER_EXTRA_MODERATOR_QP_DEN)
                );
            }
            _lastQuarterThatReputationWasUpdated = _lastParticipatedQuarter;
        }

        // at this point, the _lastQuarterThatReputationWasUpdated MUST be at least the _lastParticipatedQuarter already
        // Hence, any quarters between the _lastQuarterThatReputationWasUpdated and now must be a non-participating quarter,
        // and this participant should be penalized for those.

        // If this is their first ever participation, It is fine as well, as the reputation would be still be 0 after this step.
        // note that the carbon vote's reputation bonus will be added after this, so its fine

        _reputationDeduction =
            (currentQuarterNumber().sub(1).sub(_lastQuarterThatReputationWasUpdated))
            .mul(
                getUintConfig(CONFIG_MAXIMUM_REPUTATION_DEDUCTION)
                .add(getUintConfig(CONFIG_PUNISHMENT_FOR_NOT_LOCKING))
            );

        if (_reputationDeduction > 0) daoPointsStorage().reduceReputation(_user, _reputationDeduction);
        daoRewardsStorage().updateLastQuarterThatReputationWasUpdated(_user, currentQuarterNumber().sub(1));
    }


    // update ReputationPoint of a participant based on QuarterPoint/ModeratorQuarterPoint in a quarter
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

            daoPointsStorage().reduceReputation(_user, _reputationDeduction);
        } else {
            _reputationAddition =
                _userQP.sub(_minimalQP)
                .mul(_rpPerExtraQP_num)
                .div(_rpPerExtraQP_den);

            daoPointsStorage().increaseReputation(_user, _reputationAddition);
        }
    }

    // if the DGX rewards has not been calculated for the user's lastParticipatedQuarter, calculate and update it
    function updateUserRewardsForLastParticipatingQuarter(address _user)
        internal
        returns (bool _valid, uint256 _userClaimableDgx)
    {
        UserRewards memory data = getUserRewardsStruct(_user);
        _userClaimableDgx = daoRewardsStorage().claimableDGXs(_user);

        // There is nothing to do if:
        //   - The participant is already participating this quarter and hence this function has been called in this quarter
        //   - We have updated the rewards to the lastParticipatedQuarter
        // In ANY other cases: it means that the lastParticipatedQuarter is NOT this quarter, and its greater than lastQuarterThatRewardsWasUpdated, hence
        // This also means that this participant has ALREADY PARTICIPATED at least once IN THE PAST, and we have not calculated for this quarter
        // Thus, we need to calculate the Rewards for the lastParticipatedQuarter
        if (
            (currentQuarterNumber() == data.lastParticipatedQuarter) ||
            (data.lastParticipatedQuarter <= data.lastQuarterThatRewardsWasUpdated)
        ) {
            return (false, _userClaimableDgx);
        }

        // now we will calculate the user rewards based on info of the data.lastParticipatedQuarter

        // first we "deduct the demurrage" for the existing claimable DGXs for time period from
        // dgxDistributionDay of (lastQuarterThatRewardsWasUpdated + 1) to dgxDistributionDay of (lastParticipatedQuarter + 1)
        // (note that, when people participate in quarter n, the DGX rewards for quarter n is only released at the dgxDistributionDay of (n+1)th quarter)
        uint256 _days_elapsed = daoRewardsStorage().readDgxDistributionDay(data.lastParticipatedQuarter.add(1))
            .sub(daoRewardsStorage().readDgxDistributionDay(data.lastQuarterThatRewardsWasUpdated.add(1)))
            .div(1 days);
        uint256 _demurrageFees = daoCalculatorService().calculateDemurrage(
            _userClaimableDgx,
            _days_elapsed
        );
        _userClaimableDgx = _userClaimableDgx.sub(_demurrageFees);
        // this demurrage fees will not be accurate to the hours, but we will leave it as this.

        // this deducted demurrage is then added to the totalDGXsClaimed
        // This is as if, the user claims exactly _demurrageFees DGXs, which would be used immediately to pay for the demurrage on his claimableDGXs,
        // from dgxDistributionDay of (lastQuarterThatRewardsWasUpdated + 1) to dgxDistributionDay of (lastParticipatedQuarter + 1)
        // This is done as such, so that this _demurrageFees would "flow back into the DAO" and be counted in the dgxRewardsPool of this current quarter (in other words, dgxRewardsPoolLastQuarter of the next quarter, as will be calculated in calculateGlobalRewardsBeforeNewQuarter of the next quarter)
        // this is not 100% techinally correct as a demurrage concept, because this demurrage fees could have been incurred for the duration of the quarters in the past, but we will account them this way, as if its demurrage fees for this quarter, for simplicity.
        daoRewardsStorage().addToTotalDgxClaimed(_demurrageFees);

        uint256 _dgxRewardsAsParticipant;
        uint256 _dgxRewardsAsModerator;
        (_dgxRewardsAsParticipant, _dgxRewardsAsModerator) = daoRewardsManagerExtras().calculateUserRewardsForLastParticipatingQuarter(_user);
        _userClaimableDgx = _userClaimableDgx.add(_dgxRewardsAsParticipant).add(_dgxRewardsAsModerator);

        // update claimableDGXs. The calculation just now should have taken into account demurrage
        // such that the demurrage has been paid until dgxDistributionDay of (lastParticipatedQuarter + 1)
        daoRewardsStorage().updateClaimableDGX(_user, _userClaimableDgx);

        // update lastQuarterThatRewardsWasUpdated
        daoRewardsStorage().updateLastQuarterThatRewardsWasUpdated(_user, data.lastParticipatedQuarter);
        _valid = true;
    }

    /**
    @notice Function called by the founder after transfering the DGX fees into the DAO at the beginning of the quarter
    @dev This function needs to do lots of calculation, so it might not fit into one transaction
         As such, it could be done in multiple transactions, each time passing _operations which is the number of operations we want to calculate.
         When the value of _done is finally true, that's when the calculation is done.
         Only after this function runs, any other activities in the DAO could happen.

         Basically, if there were M participants and N moderators in the previous quarter, it takes M+N "operations".

         In summary, the function populates the DaoQuarterInfo of this quarter.
         The bulk of the calculation is to go through every participant in the previous quarter to calculate their effectiveDGDBalance and sum them to get the
         totalEffectiveDGDLastQuarter
    */
    function calculateGlobalRewardsBeforeNewQuarter(uint256 _operations)
        public
        if_founder()
        returns (bool _done)
    {
        require(isDaoNotReplaced());
        require(daoUpgradeStorage().startOfFirstQuarter() != 0); // start of first quarter must have been set already
        require(isLockingPhase());
        require(daoRewardsStorage().readDgxDistributionDay(currentQuarterNumber()) == 0); // throw if this function has already finished running this quarter

        QuarterRewardsInfo memory info;
        info.previousQuarter = currentQuarterNumber().sub(1);
        require(info.previousQuarter > 0); // throw if this is the first quarter
        info.qInfo = readQuarterInfo(info.previousQuarter);

        DaoStructs.IntermediateResults memory interResults;
        (
            interResults.countedUntil,,,
            info.totalEffectiveDGDPreviousQuarter
        ) = intermediateResultsStorage().getIntermediateResults(
            getIntermediateResultsIdForGlobalRewards(info.previousQuarter, false)
        );

        uint256 _operationsLeft = sumEffectiveBalance(info, false, _operations, interResults);
        // now we are left with _operationsLeft operations
        // the results is saved in interResults

        // if we have not done with calculating the effective balance, quit.
        if (!info.doneCalculatingEffectiveBalance) { return false; }

        (
            interResults.countedUntil,,,
            info.totalEffectiveModeratorDGDLastQuarter
        ) = intermediateResultsStorage().getIntermediateResults(
            getIntermediateResultsIdForGlobalRewards(info.previousQuarter, true)
        );

        sumEffectiveBalance(info, true, _operationsLeft, interResults);

        // if we have not done with calculating the moderator effective balance, quit.
        if (!info.doneCalculatingModeratorEffectiveBalance) { return false; }

        // we have done the heavey calculation, now save the quarter info
        processGlobalRewardsUpdate(info);
        _done = true;

        emit StartNewQuarter(currentQuarterNumber());
    }


    // get the Id for the intermediateResult for a quarter's global rewards calculation
    function getIntermediateResultsIdForGlobalRewards(uint256 _quarterNumber, bool _forModerator) internal view returns (bytes32 _id) {
        _id = keccak256(abi.encodePacked(
            _forModerator ? INTERMEDIATE_MODERATOR_DGD_IDENTIFIER : INTERMEDIATE_DGD_IDENTIFIER,
            _quarterNumber
        ));
    }


    // final step in calculateGlobalRewardsBeforeNewQuarter, which is to save the DaoQuarterInfo struct for this quarter
    function processGlobalRewardsUpdate(QuarterRewardsInfo memory info) internal {
        // calculate how much DGX rewards we got for this quarter
        info.dgxRewardsPoolLastQuarter =
            ERC20(ADDRESS_DGX_TOKEN).balanceOf(address(this))
            .add(daoRewardsStorage().totalDGXsClaimed())
            .sub(info.qInfo.sumRewardsFromBeginning);

        // starting new quarter, no one locked in DGDs yet
        daoStakeStorage().updateTotalLockedDGDStake(0);
        daoStakeStorage().updateTotalModeratorLockedDGDs(0);

        daoRewardsStorage().updateQuarterInfo(
            info.previousQuarter.add(1),
            getUintConfig(CONFIG_MINIMAL_QUARTER_POINT),
            getUintConfig(CONFIG_QUARTER_POINT_SCALING_FACTOR),
            getUintConfig(CONFIG_REPUTATION_POINT_SCALING_FACTOR),
            info.totalEffectiveDGDPreviousQuarter,

            getUintConfig(CONFIG_MODERATOR_MINIMAL_QUARTER_POINT),
            getUintConfig(CONFIG_MODERATOR_QUARTER_POINT_SCALING_FACTOR),
            getUintConfig(CONFIG_MODERATOR_REPUTATION_POINT_SCALING_FACTOR),
            info.totalEffectiveModeratorDGDLastQuarter,

            now,
            info.dgxRewardsPoolLastQuarter,
            info.qInfo.sumRewardsFromBeginning.add(info.dgxRewardsPoolLastQuarter)
        );
    }


    // Sum the effective balance (could be effectiveDGDBalance or effectiveModeratorDGDBalance), given that we have _operations left
    function sumEffectiveBalance (
        QuarterRewardsInfo memory info,
        bool _badgeCalculation, // false if this is the first step, true if its the second step
        uint256 _operations,
        DaoStructs.IntermediateResults memory _interResults
    )
        internal
        returns (uint _operationsLeft)
    {
        if (_operations == 0) return _operations; // no more operations left, quit

        if (_interResults.countedUntil == EMPTY_ADDRESS) {
            // if this is the first time we are doing this calculation, we need to
            // get the list of the participants to calculate by querying the first _operations participants
            info.users = _badgeCalculation ?
                daoListingService().listModerators(_operations, true)
                : daoListingService().listParticipants(_operations, true);
        } else {
            info.users = _badgeCalculation ?
                daoListingService().listModeratorsFrom(_interResults.countedUntil, _operations, true)
                : daoListingService().listParticipantsFrom(_interResults.countedUntil, _operations, true);

            // if this list is the already empty, it means this is the first step (calculating effective balance), and its already done;
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
            if (daoRewardsStorage().lastParticipatedQuarter(info.currentUser) != info.previousQuarter) {
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
                info.totalEffectiveDGDPreviousQuarter = info.totalEffectiveDGDPreviousQuarter.add(daoCalculatorService().calculateUserEffectiveBalance(
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
        // save to the intermediateResult storage
        intermediateResultsStorage().setIntermediateResults(
            getIntermediateResultsIdForGlobalRewards(info.previousQuarter, _badgeCalculation),
            _lastAddress,
            0,0,
            _badgeCalculation ? info.totalEffectiveModeratorDGDLastQuarter : info.totalEffectiveDGDPreviousQuarter
        );

        _operationsLeft = _operations.sub(info.userCount);
    }
}
