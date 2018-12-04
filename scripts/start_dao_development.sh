#!/usr/bin/env bash
#
# Exit script as soon as a command fails.
set -o errexit

start_ganache() {
  # We define 20 accounts with balance 1M ether, needed for high-value tests.
  local accounts=""
  for i in {1..600}
  do
    y=$(( $i * 10000000 ))
    accounts+=--account="0x$(printf %064x $y),1000000000000000000000000 "
  done

  node_modules/.bin/ganache-cli --gasLimit 0xfffffffffff $accounts > /dev/null &

  ganache_pid=$!
}

ganache_running() {
  nc -z localhost "8545"
}

start_ipfs() {
  ipfs daemon > /dev/null &
}

if pgrep -x "ipfs" > /dev/null
then
    echo "local ipfs daemon is already running"
else
    echo "local ipfs daemon is not running, starting now ..."
    start_ipfs
fi

if ganache_running; then
  echo "Using existing ganache instance"
else
  echo "Starting our own ganache instance"
  start_ganache
fi

./node_modules/.bin/truffle migrate --reset
SIMULATION=true ./node_modules/.bin/truffle exec scripts/init-dao.js
