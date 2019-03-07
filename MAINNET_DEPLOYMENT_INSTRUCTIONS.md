# DigixDAO Mainnet Deployment & Setup

## Overview

#### Pre-existing contracts
* DGD ([0xE0B7927c4aF23765Cb51314A0E0521A9645F0E2A](https://etherscan.io/address/0xe0b7927c4af23765cb51314a0e0521a9645f0e2a))
* DGD Badge ([0x54BDa709FED875224EAe569bb6817d96ef7Ed9ad](https://etherscan.io/address/0x54bda709fed875224eae569bb6817d96ef7ed9ad))
* DGX ([0x4f3AfEC4E5a3F2A6a1A411DEF7D7dFe50eE057bF](https://etherscan.io/address/0x4f3afec4e5a3f2a6a1a411def7d7dfe50ee057bf))
* DGX Demurrage Reporter ([0x5BE87E2eEC56629a223Ccd4f4861d2cCaCE213A9](https://etherscan.io/address/0x5be87e2eec56629a223ccd4f4861d2ccace213a9))
* Carbon Voting 1 ([0x9f56f330bcEB9d4e756BE94581298673e94ED592](https://etherscan.io/address/0x9f56f330bceb9d4e756be94581298673e94ed592))
* Carbon Voting 2 ([0xDEC6c0Dc7004BA23940C9eE7cB4a0528Ec4C0580](https://etherscan.io/address/0xdec6c0dc7004ba23940c9ee7cb4a0528ec4c0580))
* Multi-sig wallet (FUNDING_SOURCE) ([0x75bA02c5bAF9cc3E9fE01C51Df3cB1437E8690D4](https://etherscan.io/address/0x75ba02c5baf9cc3e9fe01c51df3cb1437e8690d4))
* Multi-sig wallet (ROOT) (**TO DEPLOY**)

#### Contracts to deploy
* DigixDAO storage
* DigixDAO service
* DigixDAO interactive

#### Multi-sig wallet (FUNDING_SOURCE)
* Already deployed on the ETH mainnet [here](https://etherscan.io/address/0x75ba02c5baf9cc3e9fe01c51df3cb1437e8690d4)
* It transfers ETH funds to `DaoFundingManager` contract

#### Multi-sig wallet (ROOT)
* Has to be deployed
* Deployment root account adds multi-sig contract as root
* It removes deployment root account from the DigixDAO root
group

## System setup

#### DAO contracts
* Clone the [dao-contracts repository](https://github.com/DigixGlobal/dao-contracts)
```
$ git clone git@github.com:DigixGlobal/dao-contracts.git
```
* Nuke the `node_modules` directory and `package-lock.json` file if present
```
$ rm -rf node_modules/
$ rm -rf package-lock.json
```
* Install package dependencies
```
$ npm i
```
* Check the versions of truffle (v4.1.15) and solc (v0.4.25)
```
$ ./node_modules/.bin/truffle version
```

#### Sigmate keystore
* Install the [Sigmate NPM package](https://www.npmjs.com/package/@digix/sigmate)
```
$ npm i -g @digix/sigmate
```
* Ensure that the sigmate version is `3.2.0`, from the output of
```
$ sigmate --help
```
* Create sigmate keystore with at least 20 accounts. Generate password in a
secure way
```
$ sigmate keystore
```
and follow as prompted
* Create a file `digixdao-mainnet-deployment.env` with file permission `600`,
and add the following content
```
export KEYSTORE=<path/to/sigmate/keystore>
export PASSWORD=<password/of/sigmate/keystore>
```
* Source the environment variables
```
$ source /path/to/digixdao-mainnet-deployment.env
```

#### Fund relevant accounts
* Print the relevant accounts
```
$ ./node_modules/.bin/truffle exec scripts/mainnet-deploy/0_print_relevant_accounts.js --network mainnet
```
* Fund the accounts based on the printed information

## Contract Deployment and Initialization

#### Compile and deploy
* Compile the contracts
```
$ rm -rf build/
$ ./node_modules/.bin/truffle compile
```
* Adjust `gasPrice` as per requirement in `truffle.js` file
* Deploy the contracts
```
$ FUNDING_SOURCE=<> DGX_DEMURRAGE_REPORTER=<> DGD=<> DGD_BADGE=<> CV_1=<> CV_2=<> DGX=<> ./node_modules/.bin/truffle migrate --network mainnet
```
Provide the addresses of the necessary contracts that have already been deployed
on mainnet. The `FUNDING_SOURCE` is the multi-sig contract that is holding all
the 400,000 ETH for DigixDAO.
* This deployment will be in the following parts:
    * Deploying `library` contracts
    * Part A, B and C for deploying `storage` layer contracts
    * Deploying `service` layer contracts
    * Part A, B, C, D and E for deploying `interactive` layer contracts

#### Configuration after deployment
* Lock the `ContractResolver` forever
```
$ ./node_modules/.bin/truffle exec scripts/mainnet-deploy/1_forever_lock_contract_resolver.js --network mainnet
```
* Add Ledger accounts as the `Founder`, `PRL` and `KYC Admin` roles
```
$ LEDGER_FOUNDER=<> LEDGER_PRL=<> LEDGER_KYC_ADMIN=<> ./node_modules/.bin/truffle exec scripts/mainnet-deploy/2_add_ledgers_as_roles.js --network mainnet
```
* Add the multi-sig contract address as root in the directory
```
$ MULTISIG=<> ./node_modules/.bin/truffle exec scripts/mainnet-deploy/3_add_root.js --network mainnet
```
* Recover leftover funds from the sigmate `root` account
```
$ COLLECTOR=<> GAS_PRICE_IN_GWEI=<> ./node_modules/.bin/truffle exec scripts/mainnet-deploy/4_recover_leftover_funds.js --network mainnet
```
provide it the address of the deployed multi-sig wallet (`FUNDING_SOURCE`) contract to `collect` all the leftover funds. Also provide what is the gas price as set in `truffle.js` file. If `GAS_PRICE_IN_GWEI` is not provided, a default value of 20 GWEI will be assigned
* Remove the default `root` (`accounts[0]`) from Gnosis multi-sig GUI.
  * Option 1: Submit a transaction from Gnosis Multi-sig wallet interface (check [here](https://github.com/DigixGlobal/dao-contracts/blob/mainnet-deploy/MAINNET_DEPLOYMENT_INSTRUCTIONS.md#steps-to-get-data-field-for-the-above-transaction) for detailed instructions on getting these parameters)
  * Option 2: First, get payload to remove the root user:
  ```
  DaoIdentity.at(DaoIdentity.address).removeGroupUser.request('<root user>')
  ```
  Then, get the destination and data and get payload to submit a transaction in the MultiSig, to be done by one of the key holders:
  ```
  # in Gnosis repo
  MultiSigWallet.at(MultiSigWallet.address).submitTransaction.request('<dao identity contract>', 0, 'data from previous step')
  ```
  Finally, get the other key holders to send this payload:
  ```
  # assuming transaction id is 0
  MultiSigWallet.at(MultiSigWallet.address).confirmTransaction.request(0)
  ```

* Transfer funds into the `DaoFundingManager` contract
    * From the `FUNDING_SOURCE` multi-sig wallet
    * Transaction to send ETH to `DaoFundingManager`


* Set start of first quarter:
Get one of the founders to send this transaction:
```
Dao.at(Dao.address).setStartOfFirstQuarter.request(<timestamp>)
```
