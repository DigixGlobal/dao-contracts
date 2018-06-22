# DigixDAO
This repository contains the Ethereum Smart contracts for DigixDAO.

![Travis](https://img.shields.io/travis/DigixGlobal/dao-contracts.svg)
[![Discord chat](https://img.shields.io/badge/discord-join%20chat%20%E2%86%92-brightgreen.svg?style=flat)](https://discord.gg/mBdKTjY)

## Getting Started
#### Installing Pre-requisites
The following are the key dependencies for setting-up/testing DigixDAO:
* [truffle](https://truffleframework.com/docs)
* [truffle-lightwallet-provider](https://github.com/DigixGlobal/truffle-lightwallet-provider)
* [solidity-statemachine-library](https://github.com/DigixGlobal/solidity-statemachine-library)
* [cacp-contracts](https://github.com/DigixGlobal/cacp-contracts/tree/dao)
* [cdap](https://github.com/DigixGlobal/cdap)

Install all dependencies (in the `dao-contracts` directory):
```
npm install -g truffle
npm install
```

#### Compiling
Compile using:
```
truffle compile
```
You may want to delete the `build/` directory before re-compiling

#### Simulating DigixDAO
We have written a script to simulate basic functionality of DigixDAO. This
script can be run by:
```
bash scripts/simulate-dao.sh
```
This runs the `test/simulateDao.js` code. Re-usable javascript functions can
be located in `test/setup.js` and `test/daoHelpers.js`.

#### Testing the smart contracts logic
We are in progress of improving the test coverage of DigixDAO contracts. The
logic in the contracts still has to be thoroughly tested. All tests can be
located in the `test` directory, segregated by the `storage`, `service` and
`interactive` layer.

To test the `interactive/DaoFundingManager` contract:
```
truffle test test/DaoFundingManager.js
```

To test the `storage` layer:
```
truffle test test/storage/*
```

<strong>Note: </strong>The truffle configuration can be found in the
`truffle.js` file. TestRPC running locally is the `development` network.

## Understanding DigixDAO
We post DigixDAO related updates fortnightly on our Medium channel. They
should be a good place to start with. Here are the posts on our Governance model:
* [Governance update #1](https://medium.com/@Digix/digixdao-governance-model-update-1-e61021718c9e)
* [Governance update #2](https://medium.com/@Digix/digixdao-governance-model-update-2-2f7ce1d1494c)
* [Governance update #3](https://medium.com/@Digix/digixdao-governance-model-update-3-2202cd117d24)
* [Governance update #4](https://medium.com/@Digix/digixdao-governance-model-update-4-2f92798242bd)

To dive in deeper, you can read the detailed Technical Specification of DigixDAO [here](https://give-me-some-url).

## Contributing
We welcome pull requests from developers. We highly recommend interested
developers to go through the [Technical Specification](https://give-me-the-same-url-as-above).

#### Smart Contract Architecture
##### Contract Resolver
All contracts implement the [Resolver Client](https://github.com/DigixGlobal/cacp-contracts/blob/dao/contracts/ResolverClient.sol) contract, and are securely fetched from one [Contract Resolver](https://github.com/DigixGlobal/cacp-contracts/blob/dao/contracts/ContractResolver.sol).

##### Storage Layer
The Storage layer contracts interact with Ethereum's persistent storage. They can only be used publicly to read from `public` functions. All the functions that can update the state variables can only be called from specific DigixDAO smart contracts, for example, [this](https://github.com/DigixGlobal/dao-contracts/blob/dev/contracts/storage/DaoStorage.sol#L596) and [this](https://github.com/DigixGlobal/dao-contracts/blob/dev/contracts/storage/DaoFundingStorage.sol#L17). We try to include as less as possible logic in contracts under this layer. The storage layer contracts are:
* DaoStorage (proposals)
* DaoSpecialStorage (Special proposals)
* DaoStakeStorage (participant stakes)
* DaoRewardsStorage (DGX rewards for participants)
* DaoFundingStorage (funding DigixDAO or proposers)
* DaoPointsStorage (quarter and reputation points)
* DaoIdentityStorage (KYC information)
* DaoConfigsStorage (configuration for DigixDAO)

##### Interactive Layer
The Interactive layer contracts can be called publicly. They contain DigixDAO's logic. DigixDAO's logic is segregated into multiple parts, namely:
* <strong>DaoFundingManager</strong>
  * Handles incoming and outgoing DAO funds
  * Writes to the DaoFundingStorage storage layer contract
* <strong>DaoRewardsManager</strong>
  * Handles DGX rewards and reputation between quarters
  * Writes to the DaoRewardsStorage storage layer contract
* <strong>DaoStakeLocking</strong>
  * Handles user stake in DigixDAO
  * Writes to the DaoStakeStorage and DaoRewardsStorage storage layer contract
* <strong>Dao</strong>
  * Handles DigixDAO proposals and migration to a newer version of DigixDAO
  * Writes to DaoStorage and DaoSpecialStorage storage layer contracts
* <strong>DaoVoting</strong>
  * Handles voting logic in DigixDAO
  * Writes to DaoStorage, DaoSpecialStorage and DaoPointsStorage storage layer contracts
* <strong>DaoVotingClaims</strong>
  * Handles the logic of settling/claiming a voting result
  * Writes to DaoStorage, DaoSpecialStorage, DaoPointsStorage and DaoConfigsStorage storage layer contracts
* <strong>DaoIdentityStorage</strong>
  * Handles the logic related to DigixDAO Directory (role and group management)
  * Writes to DaoIdentityStorage storage layer contract

##### Modifiers
Conditional checks and authorizing `msg.sender` is done in the [DaoCommon.sol](https://github.com/DigixGlobal/dao-contracts/blob/dev/contracts/common/DaoCommon.sol) contract.

## Join us on
* [Discord channel](https://discord.gg/mBdKTjY)
* [Reddit](https://www.reddit.com/r/digix/)
* [Twitter](https://twitter.com/digixglobal)
