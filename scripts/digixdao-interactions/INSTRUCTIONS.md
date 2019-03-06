## Instructions to run a script
Provide the required environment variables and run a script `script-name.js`
```
ENV_VARIABLE_1=<>[,ENV_VARIABLE_2=<>] ./node_modules/.bin/truffle exec scripts/digixdao-interactions/<script-name.js>
```

## List of scripts
#### PRL Action
* PRL action (ACTION_ID) can be stop (1) / pause (2) / unpause (3)
* Provide the PROPOSAL_ID of the proposal to be taken action on
```
PROPOSAL_ID=0xabc ACTION_ID=2 ./node_modules/.bin/truffle exec scripts/digixdao-interactions/prl-action.js
```

#### Create Proposal
* State in which the proposal has to be added in
    * `IDEA`
    * `ENDORSED`
    * `DRAFT`
    * `PROPOSAL`
    * `ONGOING` in the first milestone
    * `REVIEW` after the first milestone
* The account of proposer
    * for `accounts[9]` to be used, please provide `9`
```
STAGE=<> PROPOSER_ACCOUNT=<> ./node_modules/.bin/truffle exec scripts/digixdao-interactions/create-proposal.js
```

#### Create Special Proposal
```
./node_modules/.bin/truffle exec scripts/digixdao-interactions/create-special-proposal.js
```
