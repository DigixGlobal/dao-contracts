pragma solidity 0.4.25;

import "../common/DaoRewardsManagerCommon.sol";
import "../service/DaoCalculatorService.sol";

contract DaoRewardsManagerExtras is DaoRewardsManagerCommon {

    constructor(address _resolver) public {
        require(init(CONTRACT_DAO_REWARDS_MANAGER_EXTRAS, _resolver));
    }

    function daoCalculatorService()
        internal
        view
        returns (DaoCalculatorService _contract)
    {
        _contract = DaoCalculatorService(get_contract(CONTRACT_SERVICE_DAO_CALCULATOR));
    }

    // done
    // calculate dgx rewards; This is basically the DGXs that user has earned from participating in lastParticipatedQuarter, and can be withdrawn on the dgxDistributionDay of the (lastParticipatedQuarter + 1)
    // when user actually withdraw some time after that, he will be deducted demurrage.
    function calculateUserRewardsForLastParticipatingQuarter(address _user)
        public
        view
        returns (uint256 _dgxRewardsAsParticipant, uint256 _dgxRewardsAsModerator)
    {
        UserRewards memory data = getUserRewardsStruct(_user);

        data.effectiveDGDBalance = daoCalculatorService().calculateUserEffectiveBalance(
            data.qInfo.minimalParticipationPoint,
            data.qInfo.quarterPointScalingFactor,
            data.qInfo.reputationPointScalingFactor,
            daoPointsStorage().getQuarterPoint(_user, data.lastParticipatedQuarter),

            // RP has been updated at the beginning of the lastParticipatedQuarter in
            // a call to updateRewardsAndReputationBeforeNewQuarter(); It should not have changed since then
            daoPointsStorage().getReputation(_user),

            // lockedDGDStake should have stayed the same throughout since the lastParticipatedQuarter
            // if this participant has done anything (lock/unlock/continue) to change the lockedDGDStake,
            // updateUserRewardsForLastParticipatingQuarter, and hence this function, would have been called first before the lockedDGDStake is changed
            daoStakeStorage().lockedDGDStake(_user)
        );

        data.effectiveModeratorDGDBalance = daoCalculatorService().calculateUserEffectiveBalance(
            data.qInfo.moderatorMinimalParticipationPoint,
            data.qInfo.moderatorQuarterPointScalingFactor,
            data.qInfo.moderatorReputationPointScalingFactor,
            daoPointsStorage().getQuarterModeratorPoint(_user, data.lastParticipatedQuarter),

            // RP has been updated at the beginning of the lastParticipatedQuarter in
            // a call to updateRewardsAndReputationBeforeNewQuarter();
            daoPointsStorage().getReputation(_user),

            // lockedDGDStake should have stayed the same throughout since the lastParticipatedQuarter
            // if this participant has done anything (lock/unlock/continue) to change the lockedDGDStake,
            // updateUserRewardsForLastParticipatingQuarter would have been called first before the lockedDGDStake is changed
            daoStakeStorage().lockedDGDStake(_user)
        );

        // will not need to calculate if the totalEffectiveDGDLastQuarter is 0 (no one participated)
        if (daoRewardsStorage().readTotalEffectiveDGDLastQuarter(data.lastParticipatedQuarter.add(1)) > 0) {
            _dgxRewardsAsParticipant =
                data.effectiveDGDBalance
                .mul(daoRewardsStorage().readRewardsPoolOfLastQuarter(
                    data.lastParticipatedQuarter.add(1)
                ))
                .mul(
                    getUintConfig(CONFIG_PORTION_TO_MODERATORS_DEN)
                    .sub(getUintConfig(CONFIG_PORTION_TO_MODERATORS_NUM))
                )
                .div(daoRewardsStorage().readTotalEffectiveDGDLastQuarter(
                    data.lastParticipatedQuarter.add(1)
                ))
                .div(getUintConfig(CONFIG_PORTION_TO_MODERATORS_DEN));
        }

        // will not need to calculate if the totalEffectiveModeratorDGDLastQuarter is 0 (no one participated)
        if (daoRewardsStorage().readTotalEffectiveModeratorDGDLastQuarter(data.lastParticipatedQuarter.add(1)) > 0) {
            _dgxRewardsAsModerator =
                data.effectiveModeratorDGDBalance
                .mul(daoRewardsStorage().readRewardsPoolOfLastQuarter(
                    data.lastParticipatedQuarter.add(1)
                ))
                .mul(
                     getUintConfig(CONFIG_PORTION_TO_MODERATORS_NUM)
                )
                .div(daoRewardsStorage().readTotalEffectiveModeratorDGDLastQuarter(
                    data.lastParticipatedQuarter.add(1)
                ))
                .div(getUintConfig(CONFIG_PORTION_TO_MODERATORS_DEN));
        }
    }
}
