const MockCommitRevealContract = artifacts.require('MockCommitRevealContract.sol');

const bN = web3.toBigNumber;

contract('MockCommitRevealContract', function () {
  let contract;
  before(async function () {
    contract = await MockCommitRevealContract.new();
  });
  describe('Overall Test', function () {
    it('set the commit', async function () {
      const salt1 = 12345;
      const salt2 = 98765;
      const in1 = salt1.toString().concat(':').concat(true.toString());
      const in2 = salt2.toString().concat(':').concat(false.toString());
      const commit1 = web3.sha3(in1);
      const commit2 = web3.sha3(in2);
      await contract.setCommit(commit1, commit2);
    });
    it('compute solidity commits', async function () {
      const salt1 = 12345;
      const salt2 = 98765;
      const in1 = salt1.toString().concat(':').concat(true.toString());
      const in2 = salt2.toString().concat(':').concat(false.toString());
      await contract.computeSolidityCommit(in1, in2);

      console.log('printing vals from contract');
      console.log('initial commit 1 : ', await contract.commit1.call());
      console.log('initial commit 2 : ', await contract.commit2.call());
      console.log('solidity commit 1 : ', await contract.solidityCommit1.call());
      console.log('solidity commit 2 : ', await contract.solidityCommit2.call());
    });
  });
});
