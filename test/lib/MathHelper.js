const MathHelper = artifacts.require('MathHelper.sol');

const {
  getCurrentTimestamp,
} = require('@digix/helpers/lib/helpers');

const bN = web3.toBigNumber;

contract('MathHelper', function () {
  const mathHelper = await MathHelper.new();

  describe('currentQuarter', function () {
    it('[in the first minute of the first quarter]', async function () {
      const timeNow = getCurrentTimestamp() * 1000;
      const startTime = bN(timeNow).minus(bN(60000));
      console.log(await mathHelper.currentQuarter.call(startTime));
    });
    it('[in the last minute of the first quarter]', async function () {
      const timeNow = getCurrentTimestamp() * 1000;
      const startTime = bN(timeNow).minus(bN(7775940000));
      console.log(await mathHelper.currentQuarter.call(startTime));
    });
    it('[in the first minute of the second quarter]', async function () {
      const timeNow = getCurrentTimestamp() * 1000;
      const startTime = bN(timeNow).minus(bN(7776060000));
      console.log(await mathHelper.currentQuarter.call(startTime));
    });
  });
});
