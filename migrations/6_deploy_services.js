const ContractResolver = artifacts.require('ContractResolver.sol');

const DaoListingService = artifacts.require('DaoListingService.sol');
const DaoCalculatorService = artifacts.require('DaoCalculatorService.sol');

module.exports = async (deployer, network) => {
  if (network !== 'mainnet' && network !== 'kovan') { return null; }
  deployer.deploy(DaoListingService, ContractResolver.address)
    .then(() => {
      return deployer.deploy(DaoCalculatorService, ContractResolver.address, process.env.DGX_DEMURRAGE_REPORTER);
    })
    .then(() => {
      console.log('Deployed Services');
    });
};
