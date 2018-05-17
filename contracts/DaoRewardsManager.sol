pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./common/DaoCommon.sol";

// this contract will receive DGXs fees from the DGX fees distributors
contract DaoRewardsManager is DaoCommon {

  function DaoRewardsManager(address _resolver)
           public
  {
    require(init(CONTRACT_DAO_REWARDS_MANAGER, _resolver));
  }

    function claimRewards(uint256[] quarters)
        public
    {
        // withdraw from his claimableDGXs
    }

    struct DaoQuarterInfo {
        uint256 minimalParticipationPoint;
        uint256 quarterPointScalingFactor;
        uint256 totalEffectiveDGD;
        uint256 dgxDistributionDay; // the timestamp when DGX rewards is distributable to Holders
    }

    function updateRewardsBeforeNewQuarter(address _user)
        public
    {
        calculateUserRewardsLastQuarter(_user);
        // update reputationPoint for this quarter
    }

    // to be called to calculate and update the user rewards for the last participating quarter;
    function calculateUserRewardsLastQuarter(address _user)
        public
    {
        // the last participating quarter must be:
        // - over
        // - after the lastQuarterThatRewardsWasUpdated
        uint256 _lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(_user);
        require(currentQuarterIndex() > _lastParticipatedQuarter);
        require(_lastParticipatedQuarter > daoRewardsStorage().lastQuarterThatRewardsWasUpdated(_user));

        // now we will calculate the user rewards based on info of the _lastParticipatedQuarter
        DaoQuarterInfo qInfo;
        (
            qInfo.minimalParticipationPoint,
            qInfo.quarterPointScalingFactor,
            qInfo.totalEffectiveDGD,
            qInfo.dgxDistributionDay,
        ) = daoRewardsStorage().readQuarterInfo(_lastParticipatedQuarter);

        uint256 _userQP = daoPointsStorage().getQuarterPoint(_user, _lastParticipatedQuarter);
        // this RP has been updated at the beginning of the lastParticipatedQuarter in
        // a call to updateRewardsBeforeNewQuarter();
        uint256 _userRP = daoPointsStorage().getReputation(_user);

        uint256 _dgxRewards;
        // calculate _dgxRewards; This is basically the DGXs that user can withdraw on the dgxDistributionDay of the current quarter
        // when user actually withdraw some time after that, he will be deducted demurrage.

        // update claimableDGXs. The calculation needs to take into account demurrage since the
        // dgxDistributionDay of the last quarter as well

        // update lastQuarterThatRewardsWasUpdated

    }

    // this is called by the founder after transfering the DGX fees into the DAO at
    // the beginning of the quarter
    function calculateGlobalRewardsBeforeNewQuarter()
        if_founder()
        public
    {
        // go through every participants, calculate their EffectiveDGD balance
        // and add up to get totalEffectiveDGD

        // save this totalEffectiveDGD as well as all the current configs to DaoRewardsStorage

        // save the dgxRewardsPool for the previous quarter as well
    }

}
