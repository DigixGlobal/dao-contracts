const ContractResolver = artifacts.require('ContractResolver.sol');
const DoublyLinkedList = artifacts.require('DoublyLinkedList.sol');
const DaoStructs = artifacts.require('DaoStructs.sol');

const DaoStakeStorage = artifacts.require('DaoStakeStorage.sol');
const DaoStorage = artifacts.require('DaoStorage.sol');
const DaoSpecialStorage = artifacts.require('DaoSpecialStorage.sol');
const DaoProposalCounterStorage = artifacts.require('DaoProposalCounterStorage.sol');

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
      return deployer.deploy(DaoSpecialStorage, ContractResolver.address, { gas: 5000000 });
    })
    .then(() => {
      return deployer.deploy(DaoStorage, ContractResolver.address, { gas: 8000000, gasPrice: 30e9 });
    })
    .then(() => {
      return deployer.deploy(DaoStakeStorage, ContractResolver.address, { gas: 5000000 });
    })
    .then(() => {
      return deployer.deploy(DaoProposalCounterStorage, ContractResolver.address, { gas: 3000000 });
    })
    .then(() => {
      console.log('Deployed Storage Part B');
    });
};
