import Big from "big.js";
import BN = require("bn.js");
import { Config } from "../../src/config";
import { initialiseRate } from "../../src/rates/rates";

describe("Test Rates module", () => {
  const bitcoinBalanceLookup = async (): Promise<Big> => {
    return Promise.resolve(new Big(0));
  };

  const ethereumBalanceLookup = async (): Promise<Big> => {
    return Promise.resolve(new Big(0));
  };

  const balanceLookups = {
    bitcoin: bitcoinBalanceLookup,
    ether: ethereumBalanceLookup
  };

  it("should load the static rate if present in configuration", () => {
    const config = Config.fromFile("./tests/configs/staticRates.toml");
    console.log(config);
    const rates = initialiseRate({
      testnetMarketMakerConfig: config.testnetMarketMaker,
      configRates: config.staticRates,
      balanceLookups
    });

    expect(rates).toBeDefined();
  });

  it("should set the marketmaker if no rates defined in the config", () => {
    const config = Config.fromFile("./tests/configs/testnetMarketMaker.toml");
    const rates = initialiseRate({
      testnetMarketMakerConfig: config.testnetMarketMaker,
      configRates: config.staticRates,
      balanceLookups
    });

    expect(rates).toBeDefined();
  });

  it("should throw if both rate strategies are present in the config file", () => {
    const config = new Config({
      comitNodeUrl: "http://localhost:8000",
      seedWords:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon",
      rates: {
        static: {
          ether: { bitcoin: 0.0105 },
          bitcoin: { ether: 105.26 }
        },
        marketMaker: {
          testnet: {
            maxFraction: 1000,
            publishFraction: 2000,
            rateSpread: 5
          }
        }
      },

      ledgers: {
        bitcoin: {
          type: "coreRpc",
          rpcUsername: "bitcoin",
          rpcPassword: "password",
          rpcHost: "127.0.0.1",
          rpcPort: 18443,
          network: "regtest",
          fee: {
            defaultFee: 10,
            strategy: "hourFee"
          }
        },
        ethereum: {
          web3Endpoint: "http://localhost:8545",
          fee: {
            defaultFee: new BN(10),
            strategy: "average"
          }
        }
      }
    });

    expect(() => {
      initialiseRate({
        testnetMarketMakerConfig: config.testnetMarketMaker,
        configRates: config.staticRates,
        balanceLookups
      });
    }).toThrow(/Multiple rate strategies provided./);
  });

  it("should throw if no rate strategy is present in the config file", () => {
    const config = new Config({
      comitNodeUrl: "http://localhost:8000",
      seedWords:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon",
      rates: {},
      ledgers: {
        bitcoin: {
          type: "coreRpc",
          rpcUsername: "bitcoin",
          rpcPassword: "password",
          rpcHost: "127.0.0.1",
          rpcPort: 18443,
          network: "regtest",
          fee: {
            defaultFee: 10,
            strategy: "hourFee"
          }
        },
        ethereum: {
          web3Endpoint: "http://localhost:8545",
          fee: {
            defaultFee: new BN(10),
            strategy: "average"
          }
        }
      }
    });

    expect(() =>
      initialiseRate({
        testnetMarketMakerConfig: config.testnetMarketMaker,
        configRates: config.staticRates,
        balanceLookups
      })
    ).toThrowError(/No rate strategy defined./);
  });
});
