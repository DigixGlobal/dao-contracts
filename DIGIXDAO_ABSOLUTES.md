### DigixDAO contracts' absolutes (invariants)

1. A Participant must call either `lockDGD/withdrawDGD` or `confirmContinuedParticipation` to participate in a quarter (and deemed a "Participant", which means `DaoCommon.isParticipant(user) == true`)

1. `lastParticipatedQuarter` is always the most recent quarter that a user has participated/is participating. It is only set when user `lockDGD/withdrawDGD/confirmContinuedParticipation`

1. As long as calculateGlobalRewardsBeforeNewQuarter() has finished in a quarter, sum of all participants' `lockedDGDStake` must always be exactly the same as `totalLockedDGDStake` (in `DaoStakeStorage` contract)

1. As long as calculateGlobalRewardsBeforeNewQuarter() has finished in a quarter, sum of all moderators' `lockedDGDStake` must be exactly the same as `totalModeratorLockedDGDStake`

1. After ANY step where a participant's Reputation or DGDStake is changed, except for when a user receives a bonus from voting, or when user locks in DGDs the first time (and hence getting the bonus reputation from carbon votes), `refreshModeratorStatus()` must be called

1. Before ANY step where a participant's DGD stake is changed, `refreshDGDStake` must be called

1. In any quarter after the first quarter, `calculateGlobalRewardsBeforeNewQuarter()` must finish first (returns true) before ANY other activities in the DAO can happen, except for:
  * `DaoFundingManager.claimFunding()`
  * functions in `DaoIdentity` and `DaoWhitelisting`
  * `Dao.updatePRL()`
  * `Dao.setNewDaoContracts()`
  * `Dao.founderCloseProposals()`

1. `updateRewardsAndReputationBeforeNewQuarter()` can only and must be called by the 3 staking functions (lock/withdraw/continue).

1. After a participant doing ANY action in a locking phase of a quarter (except for `claimRewards`), the `lastQuarterThatReputationWasUpdated` is ALWAYS `currentQuarter - 1`

1. `lastQuarterThatRewardsWasUpdated` is either:
    * 0, when a user has not participated at all, or has participated for quarter X but the rewards calculation for quarter X has not been done (`updateUserRewardsForLastParticipatingQuarter` has not been called in a subsequent quarter after X)
    * exactly the same as `lastParticipatedQuarter`, when the rewards calculation for the `lastParticipatedQuarter` has been done
    * same as `previousLastParticipatedQuarter`, when the user has participated in `lastParticipatedQuarter` but the rewards has not been calculated for the `lastParticipatedQuarter`

1. The sum of all users' DGX rewards for quarter N, calculated using `calculateUserRewardsForLastParticipatingQuarter()` when their `lastParticipatedQuarter == N`, must be exactly equal to the `dgxRewardsPoolLastQuarter` of quarter N+1 (in other words, the dgx rewards pool of quarter N). Likewise, the sum of all users' dgxRewardsAsModerator should add up to the
moderator rewards pool (CONFIG_PORTION_TO_MODERATORS_NUM/CONFIG_PORTION_TO_MODERATORS_DEN * dgxRewardsPool)
    * There will be rounding error, which must only be in the order of 1e-9

1. When a participant's rewards is calculated for a quarter N that he last participated in, his current `Reputation` and `lockedDGDStake` must be exactly the same as his `Reputation` and `lockedDGDStake` when calculateGlobalRewardsBeforeNewQuarter() was called in quarter N+1.
    * Otherwise, the previous invariant will not hold

1. No matter what the circumstances, any participant will be able to:
    - withdraw all their DGDs in any locking phase, or after the DAO is migrated
    - lock DGDs and participate in DAO activities (creating proposals/voting) in any quarter.
    - withdraw all of their claimableDGXs, minus the appropriate demurrage fees

1. The collateral can only be claimed back in these scenarios:
    * Before the proposal is finalized, by calling closeProposal()
    * The proposal is failed in either Draft Voting phase or Voting phase (index 0)
    * After all milestones are done and the final voting round is passed

1. The number of non-Digix proposals that goes through the Voting Round (VotingRound index 0) in a particular quarter must be <= get_uint_config(CONFIG_NON_DIGIX_PROPOSAL_CAP_PER_QUARTER)

1. The balance of `DaoFundingManager` is always exactly the same as `DaoFundingStorage.ethInDao()`

1. Except for the whitelisted contracts in `DaoWhitelistingStorage`, no other contracts can read any information that gives away:
    * whether any voting round is passed or not.
    * whether a participant has voted yes or no in a particular voting round

    This is to prevent bribing contracts from verifying on-chain that a vote seller has indeed voted as instructed/ a voting has indeed passed/failed

1. As long as the Dao is not replaced yet, `calculateGlobalRewardsBeforeNewQuarter()` must always be able to run in the beginning of the quarter and every DGD holders who have locked in DGDs at some point will be able to withdraw all of their DGDs
