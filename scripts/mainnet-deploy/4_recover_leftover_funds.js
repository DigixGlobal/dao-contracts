const assert = require('assert');

const {
  getAccountsAndAddressOf,
  isInvalid,
} = require('./helpers');

const bN = web3.toBigNumber;

module.exports = async () => {
  web3.eth.getAccounts(async (e, accounts) => {
    const addressOf = {};
    getAccountsAndAddressOf(accounts, addressOf);
    console.log('\tget accounts \u2713');

    assert.ok(!isInvalid(process.env.COLLECTOR), 'Please provide the address for COLLECTOR');

    const collector = process.env.COLLECTOR;
    const gasPriceInGwei = !isInvalid(process.env.GAS_PRICE_IN_GWEI) ?
      parseInt(process.env.GAS_PRICE_IN_GWEI, 10) : 10;

    const gasNeededForTransfer = bN(21000 * gasPriceInGwei * (10 ** 9));

    const collectEth = (sender) => {
      web3.eth.getBalance(sender, (e, balance) => {
        console.log('\tSending balance of ', balance, ' back to the collector');
        web3.eth.sendTransaction({
          from: sender,
          to: collector,
          value: balance.minus(gasNeededForTransfer),
          gasPrice: gasPriceInGwei * (10 ** 9),
        }, function (e, r) {
          if (e) {
            console.log('error : ', e);
          } else {
            console.log('\tsent eth, txn = ', r, ' \u2713');
            console.log('DONE');
          }
        });
      });
    };

    collectEth(addressOf.root);
  });
};
