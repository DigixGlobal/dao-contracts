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
STAGE=<> ./node_modules/.bin/truffle exec scripts/digixdao-interactions/create-proposal.js
```
* There will be instances where info-server's request to fetch from IPFS times out. In that case, the proposal structure returned is the following:
```
{
    "title": "Could not fetch Proposal Details",
    "description": "Proposer must edit proposal and re-upload documents",
    "details": "The previously uploaded documents could not be stored/fetched   on/from IPFS. Kindly edit the proposal to re-upload the necessary documents",
    "milestones":
      {
        "title": "Could not fetch Proposal Details",
        "description": "Could not fetch Proposal Details",
      },
    ],
}
```
    * This case will have to be handled in the Project Details page
    * To create a proposal that returns such an entry
    ```
    ./node_modules/.bin/truffle exec scripts/digixdao-interactions/create-ipfs-timeout-proposal.js
    ```

#### Create Special Proposal
```
./node_modules/.bin/truffle exec scripts/digixdao-interactions/create-special-proposal.js
```

#### Create a Proposal that has additional docs (DGDG-322)
This will add a proposal with one version (which is finalized), and has more documents added (specifically one PDF and one Image)
```
./node_modules/.bin/truffle exec scripts/digixdao-interactions/create-proposal-more-docs.js
```
