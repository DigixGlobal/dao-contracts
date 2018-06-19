# rm -rf build/
truffle compile
truffle migrate --network development --reset
SIMULATION=true truffle exec test/simulateDao.js
