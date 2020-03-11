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
        rpcUrl: 'https://kovan.infura.io/v3/2a85a86547944f95a459766a3f3d1ab9',
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
        rpcUrl: 'https://mainnet.infura.io/v3/2a85a86547944f95a459766a3f3d1ab9',
        pollingInterval: 15000,
        // debug: true,
      }),
      gas: 8000000,
      gasPrice: 40 * (10 ** 9),
      network_id: '1',
    },
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 9000000, // need more than 8mil gas to deploy the Mock contracts. All the non-mock contracts should fit in 8mil gas
    },
  },
  solc: {
    optimizer: {
      enabled: false,
    },
  },
};
