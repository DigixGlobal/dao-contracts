const {
  getAccountsAndAddressOf,
} = require('../../test/setup');

const bN = web3.toBigNumber;

module.exports = async () => {
  web3.eth.getAccounts(async (e, accounts) => {
    const addressOf = {};
    getAccountsAndAddressOf(accounts, addressOf);
    console.log('\tget accounts \u2713');

    const collector = process.env.COLLECTOR;
    const gasNeededForTransfer = bN(100 * (10 ** 13));

    const collectEth = (sender) => {
      web3.eth.getBalance(sender, (e, balance) => {
        console.log('\tSending balance of ', balance, ' back to the collector');
        web3.eth.sendTransaction({
          from: sender,
          to: collector,
          value: balance.minus(gasNeededForTransfer),
        }, function (e, r) {
          if (e) {
            console.log('error : ', e);
          } else {
            console.log('\tsent eth, txn = ', r, ' \u2713');
          }
        });
      });
    };

    collectEth(addressOf.root);
    collectEth(addressOf.founderBadgeHolder);
  });
};
