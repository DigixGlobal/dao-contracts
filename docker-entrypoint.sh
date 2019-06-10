#!/bin/bash

cd /usr/src/dao-contracts/

rm -rf build/
rm -rf package-lock.json
rm -rf node_modules/
npm install
cd node_modules/truffle && npm install solc@0.4.25 && cd ../..
export KEYSTORE=/usr/src/dao-contracts/sigmate-v3-test-local.json
export PASSWORD=test-local
./node_modules/.bin/truffle compile

./node_modules/.bin/truffle migrate --reset --network development
SIMULATION=true ./node_modules/.bin/truffle exec scripts/init-dao.js --network development

# Execute the given or default command:
exec "$@"
