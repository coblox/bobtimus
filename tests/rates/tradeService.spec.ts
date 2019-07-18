import Big from "big.js";
import BN = require("bn.js");
import { Config } from "../../src/config";
import { createTradeEvaluationService } from "../../src/rates/tradeService";
import BitcoinWalletStub from "../doubles/bitcoinWalletStub";
import EthereumWalletStub from "../doubles/ethereumWalletStub";

describe("Test TradeService module", () => {
  const bitcoinWallet = new BitcoinWalletStub({
    nominalBalance: new Big(1)
  });

  const ethereumWallet = new EthereumWalletStub({
    nominalBalance: new Big(1)
  });

  it("should load the static rate if present in configuration", async () => {
    const config = Config.fromFile("./tests/configs/staticRates.toml");
    const rates = createTradeEvaluationService({
      config,
      bitcoinWallet,
      ethereumWallet
    });

    await expect(rates).toBeDefined();
  });

  it("should set the marketmaker if no rates defined in the config", async () => {
    const config = Config.fromFile("./tests/configs/testnetMarketMaker.toml");
    const rates = createTradeEvaluationService({
      config,
      bitcoinWallet,
      ethereumWallet
    });

    await expect(rates).toBeDefined();
  });

  it("should throw if both rate strategies are present in the config file", async () => {
    const config = new Config({
      cndUrl: "http://localhost:8000",
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
          coreRpc: {
            host: "127.0.0.1",
            port: 18443,
            auth: {
              username: "bitcoin",
              password: "password"
            }
          },
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

    await expect(
      createTradeEvaluationService({
        config,
        bitcoinWallet,
        ethereumWallet
      })
    ).rejects.toThrowError("Multiple rate strategies provided.");
  });

  it("should throw if no rate strategy is present in the config file", async () => {
    const config = new Config({
      cndUrl: "http://localhost:8000",
      seedWords:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon",
      rates: {},
      ledgers: {
        bitcoin: {
          coreRpc: {
            host: "127.0.0.1",
            port: 18443,
            auth: {
              username: "bitcoin",
              password: "password"
            }
          },
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

    await expect(
      createTradeEvaluationService({
        config,
        bitcoinWallet,
        ethereumWallet
      })
    ).rejects.toThrowError("No rate strategy defined.");
  });
});
