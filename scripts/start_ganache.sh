#!/usr/bin/env bash
#
# Exit script as soon as a command fails.
set -o errexit

start_ganache() {
  # We define 20 accounts with balance 1M ether, needed for high-value tests.
  local accounts=""
  for i in {1..600}
  do
    accounts+=--account="0x$(printf %064x $i),1000000000000000000000000 "
  done

  node_modules/.bin/ganache-cli --gasLimit 0xfffffffffff $accounts

  ganache_pid=$!
}

start_ganache
