const DoublyLinkedList = artifacts.require('DoublyLinkedList.sol');
const DaoStructs = artifacts.require('DaoStructs.sol');

module.exports = async (deployer, network) => {
  if (network !== 'mainnet' && network !== 'kovan') { return null; }
  deployer.deploy(DoublyLinkedList)
    .then(() => {
      return deployer.link(DoublyLinkedList, DaoStructs);
    })
    .then(() => {
      return deployer.deploy(DaoStructs);
    })
    .then(() => {
      console.log('Deployed libraries');
    });
};
