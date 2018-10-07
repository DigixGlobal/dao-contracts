const LightWalletProvider = require('@digix/truffle-lightwallet-provider');

const { KEYSTORE, PASSWORD } = process.env;

if (!process.env.TRAVIS_BUILD) {
  if (!KEYSTORE || !PASSWORD) { throw new Error('You must export KEYSTORE and PASSWORD (see truffle.js)'); }
}

module.exports = {
  networks: {
    kovan: {
      provider: new LightWalletProvider({
        keystore: KEYSTORE,
        password: PASSWORD,
        rpcUrl: 'https://kovan.infura.io/',
        pollingInterval: 2000,
        // debug: true,
      }),
      gas: 8000000,
      gasPrice: 20 * (10 ** 9),
      network_id: '42',
    },
    rinkeby: {
      provider: new LightWalletProvider({
        keystore: KEYSTORE,
        password: PASSWORD,
        rpcUrl: 'https://rinkeby.infura.io/',
        pollingInterval: 2000,
        // debug: true,
      }),
      gas: 6850000,
      gasPrice: 20 * (10 ** 9),
      network_id: '4',
    },
    mainnet: {
      provider: new LightWalletProvider({
        keystore: KEYSTORE,
        password: PASSWORD,
        rpcUrl: 'https://aethyr.digix.global/',
        pollingInterval: 15000,
        // debug: true,
      }),
      gas: 7900000,
      gasPrice: 40 * (10 ** 9),
      network_id: '1',
    },
    classic: {
      provider: new LightWalletProvider({
        keystore: KEYSTORE,
        password: PASSWORD,
        rpcUrl: 'https://digixparity04.digix.io/',
        pollingInterval: 5000,
        // debug: true,
      }),
      gas: 400000,
      network_id: '61',
    },
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 10000000, // need more than 8mil gas to deploy the Mock contracts. All the non-mock contracts should fit in 8mil gas
    },
  },
  solc: {
    optimizer: {
      enabled: false,
    },
  },
};
