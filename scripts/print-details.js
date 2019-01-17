const a = require('awaiting');

const DaoInformation = artifacts.require('DaoInformation.sol');

const {
  getAccountsAndAddressOf,
} = require('../test/setup');

const indices = {
  isParticipant: 0,
  isModerator: 1,
  isDigix: 2,
  redeemedBadge: 3,
  lastParticipatedQuarter: 4,
  lastQuarterThatReputationWasUpdated: 5,
  lockedDgdStake: 6,
  lockedDgd: 7,
  reputationPoints: 8,
  quarterPoints: 9,
  claimableDgx: 10,
};

module.exports = async () => {
  web3.eth.getAccounts(async (e, accounts) => {
    const addressOf = {};
    getAccountsAndAddressOf(accounts, addressOf);

    const daoInformation = await DaoInformation.deployed();
    const details = {};
    addressOf.allParticipants.forEach((participant) => {
      details[participant] = {};
    });
    await a.map(addressOf.allParticipants, 10, async (user) => {
      const userInfo = await daoInformation.readUserInfo.call(user);
      details[user].isParticipant = userInfo[indices.isParticipant];
      details[user].isModerator = userInfo[indices.isModerator];
      details[user].isDigix = userInfo[indices.isDigix];
      details[user].redeemedBadge = userInfo[indices.redeemedBadge];
      details[user].lastParticipatedQuarter = userInfo[indices.lastParticipatedQuarter].toNumber();
      details[user].lastQuarterThatReputationWasUpdated = userInfo[indices.lastQuarterThatReputationWasUpdated].toNumber();
      details[user].lockedDgdStake = userInfo[indices.lockedDgdStake].toNumber();
      details[user].lockedDgd = userInfo[indices.lockedDgd].toNumber();
      details[user].reputationPoints = userInfo[indices.reputationPoints].toNumber();
      details[user].quarterPoints = userInfo[indices.quarterPoints].toNumber();
      details[user].claimableDgx = userInfo[indices.claimableDgx].toNumber();
    });

    console.log('=========== USER INFORMATION ============\n');
    for (const user in details) {
      console.log('USER: ', user);
      console.log('\tisParticipant                       = ', details[user].isParticipant);
      console.log('\tisModerator                         = ', details[user].isModerator);
      console.log('\tisDigix                             = ', details[user].isDigix);
      console.log('\tredeemedBadge                       = ', details[user].redeemedBadge);
      console.log('\tlastParticipatedQuarter             = ', details[user].lastParticipatedQuarter);
      console.log('\tlastQuarterThatReputationWasUpdated = ', details[user].lastQuarterThatReputationWasUpdated);
      console.log('\tlockedDgdStake                      = ', details[user].lockedDgdStake);
      console.log('\tlockedDgd                           = ', details[user].lockedDgd);
      console.log('\treputationPoints                    = ', details[user].reputationPoints);
      console.log('\tquarterPoints                       = ', details[user].quarterPoints);
      console.log('\tclaimableDgx                        = ', details[user].claimableDgx, '\n');
    }
    console.log('\n=========== USER INFORMATION ============');
  });
};
