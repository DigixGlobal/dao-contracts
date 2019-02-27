const ContractResolver = artifacts.require('ContractResolver.sol');
const DoublyLinkedList = artifacts.require('DoublyLinkedList.sol');
const DaoStructs = artifacts.require('DaoStructs.sol');

const DaoStakeStorage = artifacts.require('DaoStakeStorage.sol');
const DaoStorage = artifacts.require('DaoStorage.sol');
const DaoSpecialStorage = artifacts.require('DaoSpecialStorage.sol');

module.exports = async (deployer, network) => {
  if (network !== 'mainnet' && network !== 'kovan') { return null; }
  deployer.link(DaoStructs, DaoStorage)
    .then(() => {
      deployer.link(DaoStructs, DaoSpecialStorage);
      deployer.link(DoublyLinkedList, DaoStorage);
      deployer.link(DoublyLinkedList, DaoStakeStorage);
      return deployer.link(DoublyLinkedList, DaoSpecialStorage);
    })
    .then(() => {
      return deployer.deploy(DaoSpecialStorage, ContractResolver.address);
    })
    .then(() => {
      return deployer.deploy(DaoStorage, ContractResolver.address);
    })
    .then(() => {
      return deployer.deploy(DaoStakeStorage, ContractResolver.address);
    })
    .then(() => {
      console.log('Deployed Storage Part B');
    });
};
