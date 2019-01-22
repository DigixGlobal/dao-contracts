const DoublyLinkedList = artifacts.require('DoublyLinkedList.sol');

const ContractResolver = artifacts.require('ContractResolver.sol');
const DaoIdentityStorage = artifacts.require('DaoIdentityStorage.sol');
const DaoUpgradeStorage = artifacts.require('DaoUpgradeStorage.sol');
const DaoConfigsStorage = artifacts.require('DaoConfigsStorage.sol');
const DaoPointsStorage = artifacts.require('DaoPointsStorage.sol');

module.exports = async (deployer, network) => {
  if (network !== 'mainnet') { return null; }
  deployer.deploy(ContractResolver)
    .then(() => {
      return deployer.link(DoublyLinkedList, DaoIdentityStorage);
    })
    .then(() => {
      return deployer.deploy(DaoUpgradeStorage, ContractResolver.address);
    })
    .then(() => {
      return deployer.deploy(DaoIdentityStorage, ContractResolver.address);
    })
    .then(() => {
      return deployer.deploy(DaoConfigsStorage, ContractResolver.address);
    })
    .then(() => {
      return deployer.deploy(DaoPointsStorage, ContractResolver.address);
    })
    .then(() => {
      console.log('Deployed Storage Part A');
    });
};
