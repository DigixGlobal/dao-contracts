## Test Helpers
#### setup.js
This js module provides the commonly used functions within the truffle tests. It includes functions like
* `deployFreshDao`: To deploy a completely new set of contracts for DigixDAO
* `setupParticipantsStates`: To setup dummy token balances for user accounts, and locking tokens to be participants of DigixDAO
* `deployLibraries`: To deploy the library contracts used in DigixDAO
* `deployStorage`: To deploy the storage layer contracts of DigixDAO
* `deployServices`: To deploy service layer contracts of DigixDAO
* `deployInteractive`: To deploy the interactive contracts of DigixDAO
* `phaseCorrection`: To spend some time sending dummy transactions, waiting for a phase (Locking/Main) to end, and land in the desired phase

and many more such functions. All the individual functions are documented with comments in the `setup.js` file.

#### daoHelpers.js
The `daoHelpers.js` module contains helper functions, constant values and configs from the `DaoConfigsStorage.sol` contract.

#### daoCalculationHelper.js
The `daoCalculationHelper.js` module mainly contains the calculation functions to replicate the calculations as in `DaoCalculatorService.sol` contract. It is used for:
* Reputation calculation
* DGX demurrage calculation
* DGX rewards calculation
* Quorum/Quota calculation

and many more such helpers.

#### helpers.js
Another helper required is the `@digix/helpers/lib/helper.js` module, which is imported from [this](https://github.com/DigixGlobal/digix-helpers) repository. It is used for basic helper functions such as random values, timestamps, etc.

## Truffle Tests
#### Dao.js
The `test/interactive/Dao.js` file tests the following contracts:
* `Dao.sol`
* `DaoVoting.sol`
* `DaoVotingClaims.sol`
* `DaoSpecialVotingClaims.sol`

We deploy the entire DigixDAO contracts through the `deployFreshDao` helper function for testing.

#### DaoFundingManager.js
The `test/interactive/DaoFundingManager.js` file tests the `DaoFundingManager.sol` contract.

We deploy only the storage layer contracts for testing `DaoFundingManager.sol`. The interactive layer contracts are only registered to the `ContractResolver.sol` using `accounts[0]` account. So any function call from `accounts[0]` behaves similar to, the interactive contract calling the function in `DaoFundingManager.sol` contract.

#### DaoRewardsManager.js
The `test/interactive/DaoRewardsManager.js` file tests the `DaoRewardsManager.sol` contract.

In the `resetBeforeEach` function, a fresh set of DigixDAO contracts is deployed. Also mock participants and moderators are created and added to the contracts to simulate a higher number of participants. This is mainly to test the distribution of rewards/reputation, and also testing the [multi-step calling of functions](#multi-step-calling-of-functions).

#### DaoStakeLocking.js
The `test/interactive/DaoStakeLocking.js` file tests the `DaoStakeLocking.sol` contract.

The main scenarios revolve around locking, withdrawing DGDs, redeeming DGD Badges and continuing participation in subsequent quarters.

#### Multi-step calling of functions:
For instance, the `calculateGlobalRewardsBeforeNewQuarter` function in the `DaoRewardsManager.sol` contract is supposed to be called by the founder account at the start of every quarter during the locking phase. This function effectively must loop over all the participants and moderators in DigixDAO for completion of execution. Since looping over say 4000 accounts would not be feasible in one call (due to gas limitations), we try to implement this using an `IntermediateResultsStorage.sol` contract.

The `IntermediateResultsStorage.sol` contract is used to store intermediate results after every iteration of the loop. An example to briefly explain what it does is: While summing up the numbers in the list `[1, 4, 6, 2, 3, 7, 8]`, and every function call consisting of 3 operations, the intermediate result after the first function call could be `{ countedUntil: 6, sum: 11 }`. In the next iteration of this function call, it sums up `2, 3 and 7` and stores `{ countedUntil: 7, sum: 23 }`. Finally in the last function call, the entire operation is completed.

These step-by-step calls have been tested for functions in `DaoVotingClaims.sol`, `DaoRewardsManager.sol` and `DaoSpecialVotingClaims.sol`. Some test cases for the relevant functions are:
* [claimProposalVotingResult](https://github.com/DigixGlobal/dao-contracts/blob/final-changes/test/interactive/Dao.js#L2210)
* [calculateGlobalRewardsBeforeNewQuarter](https://github.com/DigixGlobal/dao-contracts/blob/final-changes/test/interactive/DaoRewardsManager.js#L510)
