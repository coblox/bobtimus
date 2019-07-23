import Big from "big.js";
import Asset from "../../src/asset";
import { ComitMetadata } from "../../src/comitNode";
import { BitcoinConfig, Config } from "../../src/config";
import Ledger from "../../src/ledger";
import { Trade, TradeService } from "../../src/rates/tradeService";
import {
  findLatestTradeTimestamp,
  getAmountsToPublishRoute
} from "../../src/routes/tradesToPublish";
import EthereumWalletStub from "../doubles/ethereumWalletStub";

const present = new Date();
const past = new Date(present.getTime() - 5000);
const future = new Date(present.getTime() + 5000);

const btcEthTrade: Trade = {
  timestamp: present,
  protocol: "rfc003",
  buy: {
    ledger: Ledger.Bitcoin,
    asset: Asset.Bitcoin,
    quantity: new Big(1)
  },
  sell: {
    ledger: Ledger.Ethereum,
    asset: Asset.Ether,
    quantity: new Big(100)
  }
};

const ethBtcTrade: Trade = {
  timestamp: past,
  protocol: "rfc003",
  buy: {
    ledger: Ledger.Ethereum,
    asset: Asset.Ether,
    quantity: new Big(80)
  },
  sell: {
    ledger: Ledger.Bitcoin,
    asset: Asset.Bitcoin,
    quantity: new Big(1)
  }
};

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

const addressHint = "/ip4/127.0.0.1/tcp/8011";
const comitMetadata = {
  id: "somePeerId"
} as ComitMetadata;

describe("TradesToPublish tests ", () => {
  it("should return the current timestamp if nothing found", () => {
    const trade = {
      ...btcEthTrade
    };

    const tradeTimestamp = findLatestTradeTimestamp(trade);
    expect(tradeTimestamp.getTime()).toStrictEqual(present.getTime());
  });

  it("should return the same timestamp twice", () => {
    const trade = {
      ...btcEthTrade
    };
    const tradeTimestampBefore = findLatestTradeTimestamp(trade);

    const tradeTimestampAfter = findLatestTradeTimestamp(trade);

    expect(tradeTimestampBefore.getTime()).toStrictEqual(present.getTime());
    expect(tradeTimestampAfter.getTime()).toStrictEqual(present.getTime());
  });

  it("given same amount and new timestamp on second request - should return old timestamp", () => {
    const trade1 = {
      ...btcEthTrade
    };

    const trade2 = {
      ...btcEthTrade,
      timestamp: future
    };

    const tradeTimestamp1 = findLatestTradeTimestamp(trade1);
    expect(tradeTimestamp1.getTime()).toStrictEqual(present.getTime());

    const tradeTimestamp2 = findLatestTradeTimestamp(trade2);
    expect(tradeTimestamp2.getTime()).toStrictEqual(present.getTime());
  });

  it("given different amounts - should return trade specific timestamp", () => {
    const trade1 = {
      ...btcEthTrade
    };

    const trade2 = {
      ...btcEthTrade,

      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.Ether,
        quantity: new Big(110)
      }
    };

    const tradeTimestamp1 = findLatestTradeTimestamp(trade1);
    expect(tradeTimestamp1.getTime()).toStrictEqual(trade1.timestamp.getTime());

    const tradeTimestamp2 = findLatestTradeTimestamp(trade2);
    expect(tradeTimestamp2.getTime()).toStrictEqual(trade2.timestamp.getTime());
  });

  it("given different amounts but in the past - should return newer timestamp", () => {
    const trade1 = {
      ...btcEthTrade
    };

    const trade2 = {
      ...btcEthTrade,
      timestamp: past,
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.Ether,
        quantity: new Big(110)
      }
    };

    const tradeTimestamp1 = findLatestTradeTimestamp(trade1);
    expect(tradeTimestamp1.getTime()).toStrictEqual(trade1.timestamp.getTime());

    const tradeTimestamp2 = findLatestTradeTimestamp(trade2);
    expect(tradeTimestamp2.getTime()).toStrictEqual(trade1.timestamp.getTime());
  });

  it("given different trades - should return trade timestamps", () => {
    const trade1 = {
      ...btcEthTrade
    };

    const trade2 = {
      ...ethBtcTrade
    };

    const tradeTimestamp1 = findLatestTradeTimestamp(trade1);
    expect(tradeTimestamp1.getTime()).toStrictEqual(trade1.timestamp.getTime());

    const tradeTimestamp2 = findLatestTradeTimestamp(trade2);
    expect(tradeTimestamp2.getTime()).toStrictEqual(trade2.timestamp.getTime());
  });

  class MockMarketMaker implements TradeService {
    protected trades: Trade[] = [ethBtcTrade, btcEthTrade];

    public isTradeAcceptable(_: Trade): Promise<boolean> {
      return Promise.resolve(true);
    }

    public prepareTradesToPublish() {
      return Promise.resolve(this.trades);
    }
  }

  it("Should return the trades and ledgers information", async () => {
    const mockMarketMaker = new MockMarketMaker();

    const apiCall = getAmountsToPublishRoute(
      mockMarketMaker,
      getBitcoinConfig(),
      ethereumWalletMock,
      comitMetadata.id,
      addressHint
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
      addressHint: "/ip4/127.0.0.1/tcp/8011",
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
          buy: {
            asset: "ether",
            ledger: "ethereum",
            quantity: "80"
          },
          protocol: "rfc003",
          sell: {
            asset: "bitcoin",
            ledger: "bitcoin",
            quantity: "1"
          },
          timestamp: ethBtcTrade.timestamp.toISOString()
        },
        {
          buy: {
            asset: "bitcoin",
            ledger: "bitcoin",
            quantity: "1"
          },
          protocol: "rfc003",
          sell: {
            asset: "ether",
            ledger: "ethereum",
            quantity: "100"
          },
          timestamp: btcEthTrade.timestamp.toISOString()
        }
      ]
    };

    await apiCall(req as any, res as any);
    let result = await res.sendCalledWith;
    expect(result).toBeDefined();
    expect(result).toEqual(expected);

    await apiCall(req as any, res as any);
    result = await res.sendCalledWith;
    expect(result).toBeDefined();
    expect(result).toEqual(expected);
  });
});
