const getAccountsAndAddressOf = function (accounts, addressOf) {
  const addressOfTemp = {
    root: accounts[0],
  };
  for (const key in addressOfTemp) addressOf[key] = addressOfTemp[key];
};

const isInvalid = (param) => {
  return (param === '' || param === undefined);
};

module.exports = {
  getAccountsAndAddressOf,
  isInvalid,
};
