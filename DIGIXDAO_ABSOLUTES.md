### DigixDAO contracts' absolutes
1. a Participant must call either `lockDGD/withdrawDGD` or `confirmContinuedParticipation` to participate in a quarter (and deemed a "Participant", which means `DaoCommon.isParticipant(user) == true`)
1. `lastParticipatedQuarter` is always the most recent quarter that a user has participated/is participating. It is only set when user `lockDGD/withdrawDGD/confirmContinuedParticipation`
1. sum of everyone's `lockedDGDStake` must be exactly the same as `totalLockedDGDStake` (in `DaoStakeStorage` contract)
1. sum of all moderators' `lockedDGDStake` must be exactly the same as `totalModeratorLockedDGDStake`
1. after ANY step where a participant's Reputation or DGDStake is changed, except for when user locks in DGDs the first time (and hence getting the bonus reputation from carbon votes), `refreshModeratorStatus()` must be called
1. after ANY step where a participant's DGD stake is changed, `refreshDGDStake` must be called
1. In a quarter, `calculateGlobalRewardsBeforeNewQuarter()` must finish first (returns true) before ANY other activities in the DAO can happen
1. `updateRewardsBeforeNewQuarter()` can only and must be called by the 3 staking functions (lock/withdraw/continue).
1. after doing ANY action in a locking phase of a quarter, the `lastQuarterThatReputationWasUpdated` is ALWAYS `currentQuarter - 1`
