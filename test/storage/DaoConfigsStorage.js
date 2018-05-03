const a = require('awaiting');

const {
  deployLibraries,
} = require('../setup');

const bN = web3.toBigNumber;

const callingKeys = [
  'c:config:controller',
];

contract('DaoConfigsStorage', function (accounts) {
  before(async function () {

  });

  describe('Initialization', function () {

  });

  describe('set_uint_config', function () {
    it('[not called by CONTRACT_CONFIG_CONTROLLER]: revert', async function () {

    });
    it('[add new uint config]: verify public variable', async function () {

    });
    it('[update uint config]: verify public variable', async function () {

    });
  });

  describe('set_bytes_config', function () {
    it('[not called by CONTRACT_CONFIG_CONTROLLER]: revert', async function () {

    });
    it('[add new bytes config]: verify public variable', async function () {

    });
    it('[update bytes config]: verify public variable', async function () {

    });
  });

  describe('set_address_config', function () {
    it('[not called by CONTRACT_CONFIG_CONTROLLER]: revert', async function () {

    });
    it('[add new address config]: verify public variable', async function () {

    });
    it('[update address config]: verify public variable', async function () {

    });
  });
});
