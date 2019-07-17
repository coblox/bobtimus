import Big from "big.js";
import { BitcoinConfig, Config } from "../src/config";
import Balances, { BalanceLookups } from "../src/rates/balances";
import TestnetMarketMaker from "../src/rates/testnetMarketMaker";
import { TradeService } from "../src/rates/tradeService";
import { getAmountsToPublishRoute } from "../src/routes/tradesToPublish";
import EthereumWalletStub from "./doubles/ethereumWalletStub";

async function createMockBalances(
  bitcoinBalance: number,
  etherBalance: number
) {
  const mockBalanceLookups: BalanceLookups = {
    bitcoin: () => Promise.resolve(new Big(bitcoinBalance)),
    ether: () => Promise.resolve(new Big(etherBalance))
  };
  return Balances.create(mockBalanceLookups, 20);
}

function getBitcoinConfig(): BitcoinConfig {
  const config = Config.fromFile("./tests/configs/testnetMarketMaker.toml");
  if (!config.bitcoinConfig) {
    throw new Error("Could not load bitcoin config");
  }
  return config.bitcoinConfig;
}

const ethereumWalletMock = new EthereumWalletStub({
  nominalBalance: new Big(1000),
  chainId: 17
});

describe("Bobtimus API tests", () => {
  it("Should return the balances ", async () => {
    const testnetMarketMaker: TradeService = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );

    const timeStampMock = new Date();
    const apiCall = getAmountsToPublishRoute(
      testnetMarketMaker,
      getBitcoinConfig(),
      ethereumWalletMock,
      "somePeerId",
      timeStampMock
    );

    const req = {
      body: {}
    };

    const res = {
      sendCalledWith: "",
      async send(arg: any) {
        this.sendCalledWith = arg;
      }
    };

    const expected = {
      peerId: "somePeerId",
      ledgers: [
        {
          name: "bitcoin",
          network: "regtest"
        },
        {
          name: "ethereum",
          network: "regtest"
        }
      ],
      rates: [
        {
          timestamp: timeStampMock,
          protocol: "rfc003",
          buy: {
            ledger: "bitcoin",
            asset: "bitcoin",
            quantity: "0.525"
          },
          sell: {
            ledger: "ethereum",
            asset: "ether",
            quantity: "5"
          }
        },
        {
          timestamp: timeStampMock,
          protocol: "rfc003",
          buy: {
            ledger: "ethereum",
            asset: "ether",
            quantity: "5.25"
          },
          sell: {
            ledger: "bitcoin",
            asset: "bitcoin",
            quantity: "0.5"
          }
        }
      ]
    };

    await apiCall(req as any, res as any);

    const result = await res.sendCalledWith;
    expect(result).toBeDefined();
    expect(result).toEqual(expected);
  });
});
