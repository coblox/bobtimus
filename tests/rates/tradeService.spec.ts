import Big from "big.js";
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

  it("should load the static rate if passed", async () => {
    const rates = createTradeEvaluationService({
      staticRates: { ether: { bitcoin: 0.0105 }, bitcoin: { ether: 105.26 } },
      bitcoinWallet,
      ethereumWallet
    });

    await expect(rates).toBeDefined();
  });

  it("should set the marketmaker if no rates is passed", async () => {
    const rates = createTradeEvaluationService({
      testnetMarketMaker: {
        rateSpread: 5,
        maxFraction: 1000,
        publishFraction: 2000
      },
      lowBalanceThresholdPercentage: 20,
      bitcoinWallet,
      ethereumWallet
    });

    await expect(rates).toBeDefined();
  });

  it("should throw if both rate strategies are passed", async () => {
    await expect(
      createTradeEvaluationService({
        testnetMarketMaker: {
          rateSpread: 5,
          maxFraction: 1000,
          publishFraction: 2000
        },
        staticRates: { ether: { bitcoin: 0.0105 }, bitcoin: { ether: 105.26 } },
        bitcoinWallet,
        ethereumWallet
      })
    ).rejects.toThrowError("Multiple rate strategies provided.");
  });

  it("should throw if no rate strategy is passed", async () => {
    await expect(
      createTradeEvaluationService({
        bitcoinWallet,
        ethereumWallet
      })
    ).rejects.toThrowError("No rate strategy defined.");
  });
});
