### DigixDAO contracts' absolutes (invariants)

1. a Participant must call either `lockDGD/withdrawDGD` or `confirmContinuedParticipation` to participate in a quarter (and deemed a "Participant", which means `DaoCommon.isParticipant(user) == true`)

1. `lastParticipatedQuarter` is always the most recent quarter that a user has participated/is participating. It is only set when user `lockDGD/withdrawDGD/confirmContinuedParticipation`

1. sum of everyone's `lockedDGDStake` must be exactly the same as `totalLockedDGDStake` (in `DaoStakeStorage` contract)

1. sum of all moderators' `lockedDGDStake` must be exactly the same as `totalModeratorLockedDGDStake`

1. after ANY step where a participant's Reputation or DGDStake is changed, except for when user locks in DGDs the first time (and hence getting the bonus reputation from carbon votes), `refreshModeratorStatus()` must be called

1. after ANY step where a participant's DGD stake is changed, `refreshDGDStake` must be called

1. In a quarter, `calculateGlobalRewardsBeforeNewQuarter()` must finish first (returns true) before ANY other activities in the DAO can happen

1. `updateRewardsAndReputationBeforeNewQuarter()` can only and must be called by the 3 staking functions (lock/withdraw/continue).

1. after doing ANY action in a locking phase of a quarter (except for `claimRewards`), the `lastQuarterThatReputationWasUpdated` is ALWAYS `currentQuarter - 1`

1. `lastQuarterThatRewardsWasUpdated` is either:
    * 0, when a user has not participated at all, or has participated for quarter X but the rewards calculation for quarter X has not been done (`updateUserRewardsForLastParticipatingQuarter` has not been called in a subsequent quarter after X)
    * exactly the same as `lastParticipatedQuarter`, when the rewards calculation for the `lastParticipatedQuarter` has been done
    * same as `previousLastParticipatedQuarter`, when the user has participated in `lastParticipatedQuarter` but the rewards has not been calculated for the `lastParticipatedQuarter`

1. The sum of all users' DGX rewards for quarter N, calculated using `calculateUserRewardsForLastParticipatingQuarter()` when their `lastParticipatedQuarter == N`, must be exactly equal to the `dgxRewardsPoolLastQuarter` of quarter N+1 (in other words, the dgx rewards pool of quarter N). Likewise, the sum of all users' dgxRewardsAsModerator should add up to the
moderator rewards pool (CONFIG_PORTION_TO_MODERATORS_NUM/CONFIG_PORTION_TO_MODERATORS_DEN * dgxRewardsPool)

1. When a participant's rewards is calculated for a quarter N that that he last participated in, his current `Reputation` and `lockedDGDStake` must be exactly the same as his `Reputation` and `lockedDGDStake` when calculateGlobalRewardsBeforeNewQuarter() was called in quarter N.
    * Otherwise, the previous invariant will not hold

1. No matter what the circumstances, any participant will be able to:
    - withdraw all their DGDs in any locking phase, or after the DAO is migrated
    - lock DGDs and participate in DAO activities (creating proposals/voting) in any quarter.
    - withdraw all of their claimableDGXs, minus the appropriate demurrage fees
