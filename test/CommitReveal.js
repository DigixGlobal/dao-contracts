const a = require('awaiting');

const MockCommitRevealContract = artifacts.require('MockCommitRevealContract.sol');

const bN = web3.toBigNumber;

const {
  randomBigNumber,
} = require('@digix/helpers/lib/helpers');

const Web3Utils = require('web3-utils');

contract('MockCommitRevealContract', function (accounts) {
  let contract;
  before(async function () {
    contract = await MockCommitRevealContract.new();
  });
  describe('address[1]', function () {
    it('verify', async function () {
      const vote1 = true;
      const salt1 = randomBigNumber(bN);
      const commit1 = Web3Utils.soliditySha3(
        {type: 'address', value: accounts[1]},
        {type: 'bool', value: vote1},
        {type: 'uint256', value: salt1},
      );
      await contract.setCommit(commit1, { from: accounts[1] });

      const vote2 = false;
      const salt2 = randomBigNumber(bN);
      const commit2 = Web3Utils.soliditySha3(
        {type: 'address', value: accounts[2]},
        {type: 'bool', value: vote2},
        {type: 'uint256', value: salt2},
      );
      await contract.setCommit(commit2, { from: accounts[2] });

      assert.deepEqual(await contract.verify.call(vote1, salt1, { from: accounts[1] }), true);
      assert.deepEqual(await contract.verify.call(vote2, salt2, { from: accounts[2] }), true);
      assert(await a.failure(contract.verify.call(vote2, salt2, { from: accounts[1] })));
      assert(await a.failure(contract.verify.call(vote1, salt1, { from: accounts[2] })));
    });
  });
});
