const DoublyLinkedList = artifacts.require('DoublyLinkedList.sol');

const ContractResolver = artifacts.require('ContractResolver.sol');
const DaoIdentityStorage = artifacts.require('DaoIdentityStorage.sol');
const DaoUpgradeStorage = artifacts.require('DaoUpgradeStorage.sol');
const DaoConfigsStorage = artifacts.require('DaoConfigsStorage.sol');
const DaoPointsStorage = artifacts.require('DaoPointsStorage.sol');

module.exports = async (deployer, network) => {
  if (network !== 'mainnet' && network !== 'kovan') { return null; }
  deployer.deploy(ContractResolver, { gas: 700000 })
    .then(() => {
      return deployer.link(DoublyLinkedList, DaoIdentityStorage);
    })
    .then(() => {
      return deployer.deploy(DaoUpgradeStorage, ContractResolver.address, { gas: 4000000 });
    })
    .then(() => {
      return deployer.deploy(DaoIdentityStorage, ContractResolver.address, { gas: 6000000 });
    })
    .then(() => {
      return deployer.deploy(DaoConfigsStorage, ContractResolver.address, { gas: 7000000, gasPrice: 30e9 });
    })
    .then(() => {
      return deployer.deploy(DaoPointsStorage, ContractResolver.address, { gas: 4000000 });
    })
    .then(() => {
      console.log('Deployed Storage Part A');
    });
};
