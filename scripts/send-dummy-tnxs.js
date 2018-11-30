module.exports = async function () {
  await web3.eth.getAccounts(async function (e, accounts) {
    const sleep = async (t) => {
      return new Promise(function (resolve) {
        setTimeout(resolve, t);
      });
    };

    const sendTnx = async () => {
      await sleep(15000);
      const a = await web3.eth.sendTransaction({ from: accounts[0], to: accounts[1], value: 1e16 });
      console.log(a);
      sendTnx();
    };

    sendTnx();
  });
};
