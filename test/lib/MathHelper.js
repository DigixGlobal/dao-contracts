const MathHelper = artifacts.require('MockMathHelper.sol');

const {
  getCurrentTimestamp,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('MathHelper', function () {
  const mathHelper = await MathHelper.new();
});
