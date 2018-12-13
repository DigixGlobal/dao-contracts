module.exports = async function () {
  await web3.eth.getAccounts(async function (e, accounts) {
    console.log('got accounts = ', accounts);
    const sleep = async (t) => {
      return new Promise(function (resolve) {
        setTimeout(resolve, t);
      });
    };

    const sendTnx = async () => {
      await sleep(15000);
      console.log('sending txn');
      const a = await web3.eth.sendTransaction({ from: accounts[0], to: accounts[1], value: web3.toWei(1, 'gwei') });
      console.log('sent txn');
      console.log(a);
      sendTnx();
    };

    sendTnx();
  });
};
