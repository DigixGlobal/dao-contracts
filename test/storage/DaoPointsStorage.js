const a = require('awaiting');

const {
  deployLibraries,
} = require('../setup');

const bN = web3.toBigNumber;

const callingKeys = [
  'c:config:controller',
];

contract('DaoPointsStorage', function (accounts) {
  before(async function () {

  });

  describe('Initialization', function () {

  });

  describe('addQuarterPoint', function () {
    it('[not called by INTERACTIVE]: revert', async function () {
      
    });
  });

  describe('addReputation', function () {
    it('[not called by INTERACTIVE]: revert', async function () {
      
    });
  });

  describe('subtractReputation', function () {
    it('[not called by INTERACTIVE]: revert', async function () {
      
    });
  });
});
