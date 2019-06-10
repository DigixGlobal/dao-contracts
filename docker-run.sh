#!/bin/bash

cd /usr/src/dao-contracts/
export KEYSTORE=/usr/src/dao-contracts/sigmate-v3-test-local.json
export PASSWORD=test-local
./node_modules/.bin/truffle exec scripts/send-dummy-tnxs.js --network development > /dev/null
