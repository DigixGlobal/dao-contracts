const {
  indexRange,
} = require('@digix/helpers/lib/helpers');

const BADGE_HOLDER_COUNT = 4;
const DGD_HOLDER_COUNT = 6;

const getAccountsAndAddressOf = function (accounts, addressOf) {
  const addressOfTemp = {
    root: accounts[0],
    prl: accounts[1],
    kycadmin: accounts[2],
    founderBadgeHolder: accounts[3],
    badgeHolders: indexRange(4, 4 + BADGE_HOLDER_COUNT).map(id => accounts[id]), // accounts[4] to accounts[7]
    dgdHolders: indexRange(4 + BADGE_HOLDER_COUNT, 4 + BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(id => accounts[id]), // accounts[8] to accounts[13]
    allParticipants: indexRange(4, 4 + BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(id => accounts[id]), // accounts[4] to accounts[13]
    multiSigUsers: indexRange(16, 19).map(id => accounts[id]), // accounts[16], accounts[17] and accounts[18]
  };
  for (const key in addressOfTemp) addressOf[key] = addressOfTemp[key];
};

module.exports = {
  getAccountsAndAddressOf,
};
