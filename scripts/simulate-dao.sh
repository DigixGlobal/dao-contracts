rm -rf build/
truffle compile
truffle migrate --network development --reset
truffle exec test/simulateDao.js
