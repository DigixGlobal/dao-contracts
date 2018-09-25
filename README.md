# DigixDAO
This repository contains the Ethereum Smart contracts for DigixDAO.

[![Travis](https://img.shields.io/travis/DigixGlobal/dao-contracts.svg)](https://travis-ci.org/DigixGlobal/dao-contracts)
[![Discord chat](https://img.shields.io/badge/discord-join%20chat%20%E2%86%92-brightgreen.svg?style=flat)](https://discord.gg/mBdKTjY)

## Setup
#### Installing Pre-requisites
The following are the key dependencies for setting-up/testing DigixDAO:
* [truffle](https://truffleframework.com/docs)
* [truffle-lightwallet-provider](https://github.com/DigixGlobal/truffle-lightwallet-provider)
* [solidity-statemachine-library](https://github.com/DigixGlobal/solidity-statemachine-library)
* [cacp-contracts](https://github.com/DigixGlobal/cacp-contracts/tree/dao)
* [cdap](https://github.com/DigixGlobal/cdap)

Install all dependencies (in the `dao-contracts` directory):
```
npm install
```

#### Compiling
Compile using:
```
npm run compile
```
You may want to delete the `build/` directory before re-compiling

#### Simulating DigixDAO
We have written a script to simulate basic functionality of DigixDAO. This
script can be run by:
```
npm run test:simulate
```
This runs the `test/simulateDao.js` code. Re-usable javascript functions can
be located in `test/setup.js` and `test/daoHelpers.js`.

#### Testing
We are in progress of improving the test coverage of DigixDAO contracts. All tests can be
located in the `test` directory, segregated by the `storage`, `service` and
`interactive` layer. You can refer to [this](DIGIXDAO_TEST_SETUP) for an overview of how the tests work.

Before running any tests, you need to run Ganache, a development Ethereum instance, in a separate terminal:
```
npm run ganache
```

To test the `interactive/DaoFundingManager` contract:
```
node_modules/.bin/truffle test test/DaoFundingManager.js
```

To test the `storage` layer:
```
node_modules/.bin/truffle test test/storage/*
```

<strong>Note: </strong>The truffle configuration can be found in the
`truffle.js` file. Ganache running locally is the `development` network.

#### Building documentation using [doxity](https://github.com/DigixGlobal/doxity/tree/doxity-latest)
Doxity is a really cool tool to generate a static page for contract documentations.

Install dependencies for the doxity project
```
cd scripts/doxity/
npm install
```

After making modifications to the contracts (or adding [Natspec](https://github.com/ethereum/wiki/wiki/Ethereum-Natural-Specification-Format)), to compile the documentation from contracts
```
npm run docs:compile
```

To publish the compiled documentation into HTML pages
```
npm run docs:publish
```

To start the [Gatsby](https://www.npmjs.com/package/gatsby) server
```
npm run docs:server
```

You can now view the documentation at `http://localhost:8000`

The latest documentation based on the `master` branch is available [here](https://digixglobal.github.io/dao-contracts)

## Understanding DigixDAO
To understand how DigixDAO works, the best place to start is reading  the [Governance Model paper](doc/GovernanceModel.pdf)

Feel free to join our [Discord channel](https://discord.gg/mBdKTjY), `dgdao-governance` room, to talk about DigixDAO governance.

## Auditing of DigixDAO contract codes
[These](DIGIXDAO_ABSOLUTES.md) are the absolutes/invariants of DigixDAO contracts. If you can make any of these absolutes false, you have found a bug in our contracts.

The contracts' functions have also been extensively commented on their purpose and expected behaviour. If those comments do not hold, it's highly likely that you have found a bug in our contracts.

Feel free to try to break our contracts and please contact us if you successfully find a bug.

## Contributing
We welcome pull requests from developers. We highly recommend interested
developers to go through the [DigixDAO Governance Model](doc/GovernanceModel.pdf).

## Smart Contract Architecture
Most of our contracts have been documented extensively in their codes. This is an overview of what each contract does:
##### Contract Resolver
Most contracts implement the [Resolver Client](https://github.com/DigixGlobal/cacp-contracts/blob/dao/contracts/ResolverClient.sol) contract, whose addresses are securely fetched from one [Contract Resolver](https://github.com/DigixGlobal/cacp-contracts/blob/dao/contracts/ContractResolver.sol).

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
