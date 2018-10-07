## Contracts
The contracts to be audited are:
* All the contracts in the following folders of this repository at commit `81ca6846d8965effc0c652274401808bb13f5869` ([link](https://github.com/DigixGlobal/dao-contracts/tree/81ca6846d8965effc0c652274401808bb13f5869)):
  * `contracts/common`
  * `contracts/interactive`
  * `contracts/lib`
  * `contracts/service`
  * `contracts/storage`

* The following contracts of the `cacp-contracts` repository at commit `2a3cd3d2d1cfd6c6d97572b426d096a86d23961c` ([link](https://github.com/DigixGlobal/cacp-contracts/tree/2a3cd3d2d1cfd6c6d97572b426d096a86d23961c)):
  * `contracts/ContractResolver.sol`
  * `contracts/ResolverClient.sol`

* Contracts in repositories `cdap`, `solidity-collections` have already been audited and can be assumed to be safe and behaving as expected.

## Contract logic
* The contracts are supposed to implement the DigixDAO governance model, as specified in the Governance model paper that will be sent to the auditor. Any behaviors in the contracts that do not follow the paper are considered a bug.

* There are absolutes/invariants that must hold in the contracts, as specified [here](DIGIXDAO_ABSOLUTES.md). If any of these do not hold, it is considered a bug.

* The contracts' functions have been extensively documented, on their purpose and expected behaviors. If any of these do not hold, it is potentially a bug. The auditor could double confirm with Digix on these, as some functions' comments could be outdated.

In short, the first two sources (Governance model and the absolutes/invariants) should be strictly followed, while the comments in the code are more guidelines that should hold.

## Testing
All the tests in the following folders are working and passing:
* `test/interactive`
* `test/interactiveAlternativeMethod`
* `test/service`
* `test/storage`

There is a script to test a simulation of the DAO, which is also working:
```
npm run test:simulate
```

There is also test for the deployment of the DAO and transfering important keys to a multisig:
```
npm run test:deployment
```
