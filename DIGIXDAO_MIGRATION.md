# Steps for migrating to a new set of DigixDAO contracts
1. Deploy new set of Dao contracts. Among which, there should be a main Dao contract, and a FundingManager contract where the ETHs will be transfered to, and a RewardsManager where the DGXs will be transfered to.

1. Must wait until a Locking Phase of a quarter, do the normal global operations:
* transfer the DGXs of the last quarter to the Dao
* call `calculateGlobalRewardsBeforeNewQuarter`

1. Call `setNewDaoContracts` function before the `migrateToNewDao` (this is to prevent mistypings of contract addresses)

1. [Must still be in the Locking Phase] call `migrateToNewDao` , the ETHs will be transfered to the new FundingManager. DGXs will be transfered to the new contracts as well.

1. Copy the following information to the new set of Dao contracts:
* On-going proposals -> this is a lot of copying we need to do. Probably we should only copy the proposal versions and the votes for the last voting round.
* Reputation points
* [pending changes] ClaimableDGXs as well, which should take into account the demurrage fees
