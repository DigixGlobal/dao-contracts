#!/bin/bash

cd /usr/src/dao-contracts/
./node_modules/.bin/truffle migrate --reset --network development
SIMULATION=true ./node_modules/.bin/truffle exec scripts/init-dao.js --network development
echo "hello 1"
./node_modules/.bin/truffle exec scripts/send-dummy-tnxs.js --network development > /dev/null &
echo "hello 2"

exec "$@"
