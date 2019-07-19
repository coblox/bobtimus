import Big from "big.js";
import MockDate from "mockdate";
import Asset from "../../src/asset";
import { ComitMetadata } from "../../src/comitNode";
import { BitcoinConfig, Config } from "../../src/config";
import Ledger from "../../src/ledger";
import Balances from "../../src/rates/balances";
import TestnetMarketMaker from "../../src/rates/testnetMarketMaker";
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

function balance(balance: number) {
  return Promise.resolve(new Big(balance));
}

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

  it("Should return the trade with the same timestamp if the quantities did not change", async () => {
    const bitcoinBalance = 100;
    const etherBalance = 1000;

    const balances = await Balances.create(
      {
        bitcoin: () => balance(bitcoinBalance),
        ether: () => balance(etherBalance)
      },
      20
    );

    const testnetMarketMaker: TradeService = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await balances
    );

    const apiCall = getAmountsToPublishRoute(
      testnetMarketMaker,
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
      addressHint,
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
          timestamp: "2015-06-14T22:12:05.275Z",
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
          timestamp: "2015-06-14T22:12:05.275Z",
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

    MockDate.set(1434319925275);
    await apiCall(req as any, res as any);
    let result = await res.sendCalledWith;
    expect(result).toBeDefined();
    expect(result).toEqual(expected);

    MockDate.set(1534319925275);
    await apiCall(req as any, res as any);
    result = await res.sendCalledWith;
    expect(result).toBeDefined();
    expect(result).toEqual(expected);
  });

  it("Should return the trade with the same timestamp if the quantities did not change", async () => {
    let bitcoinBalance = 100;
    const etherBalance = 1000;

    const balances = await Balances.create(
      {
        bitcoin: () => balance(bitcoinBalance),
        ether: () => balance(etherBalance)
      },
      20
    );

    const testnetMarketMaker: TradeService = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await balances
    );

    const apiCall = getAmountsToPublishRoute(
      testnetMarketMaker,
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
      addressHint,
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
          timestamp: "2015-06-14T22:12:05.275Z",
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
          timestamp: "2015-06-14T22:12:05.275Z",
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

    MockDate.set(1434319925275);
    await apiCall(req as any, res as any);
    let result = await res.sendCalledWith;
    expect(result).toBeDefined();
    expect(result).toEqual(expected);

    bitcoinBalance = 10;
    MockDate.set(1534319925275);
    expected.rates[0].buy.quantity = "0.0525";
    expected.rates[1].sell.quantity = "0.05";
    expected.rates[0].timestamp = "2018-08-15T07:58:45.275Z";
    expected.rates[1].timestamp = "2018-08-15T07:58:45.275Z";
    await apiCall(req as any, res as any);
    result = await res.sendCalledWith;
    expect(result).toBeDefined();
    expect(result).toEqual(expected);
  });
});
