const a = require('awaiting');

const {
  deployLibraries,
} = require('../setup');

const bN = web3.toBigNumber;

const callingKeys = [
  'c:config:controller',
];

contract('DaoStakeStorage', function (accounts) {
  before(async function () {

  });

  describe('Initialization', function () {

  });

  describe('updateTotalLockedDGDStake', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {

    });
  });

  describe('updateTotalLockedBadges', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {

    });
  });

  describe('updateUserDGDStake', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {

    });
  });

  describe('updateUserBadgeStake', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {

    });
  });

  describe('addParticipant', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {

    });
  });

  describe('removeParticipant', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {

    });
  });

  describe('addBadgeParticipant', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {

    });
  });

  describe('removeBadgeParticipant', function () {
    it('[not called from CONTRACT_DAO_STAKE_LOCKING]: revert', async function () {

    });
  });

  describe('Read Functions', function () {
    
  });
});
