import Big from "big.js";
import Asset from "../../src/asset";
import { ComitMetadata } from "../../src/comitNode";
import Ledger from "../../src/ledger";
import { Offer, TradeService } from "../../src/rates/tradeService";
import {
  findLatestOfferTimestamp,
  getOffersToPublishRoute,
  ToPublish
} from "../../src/routes/offersToPublish";
import EthereumWalletStub from "../doubles/ethereumWalletStub";

const present = new Date();
const past = new Date(present.getTime() - 5000);
const future = new Date(present.getTime() + 5000);

const payAsset = new Asset("PAY", Ledger.Ethereum, {
  address: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
  decimals: 18
});

const btcEthTrade: Offer = {
  timestamp: present,
  protocol: "rfc003",
  buy: {
    ledger: Ledger.Bitcoin,
    asset: Asset.bitcoin,
    quantity: new Big(1)
  },
  sell: {
    ledger: Ledger.Ethereum,
    asset: Asset.ether,
    quantity: new Big(100)
  }
};

const ethBtcTrade: Offer = {
  timestamp: past,
  protocol: "rfc003",
  buy: {
    ledger: Ledger.Ethereum,
    asset: Asset.ether,
    quantity: new Big(80)
  },
  sell: {
    ledger: Ledger.Bitcoin,
    asset: Asset.bitcoin,
    quantity: new Big(1)
  }
};

const btcPayTrade: Offer = {
  timestamp: present,
  protocol: "rfc003",
  buy: {
    ledger: Ledger.Bitcoin,
    asset: Asset.bitcoin,
    quantity: new Big(1)
  },
  sell: {
    ledger: Ledger.Ethereum,
    asset: payAsset,
    quantity: new Big(1000)
  }
};

const bitcoinConfig = {
  network: "regtest",
  fee: { defaultFee: 10, strategy: "hourFee" },
  coreRpc: {
    host: "127.0.0.1",
    port: 18443,
    auth: {
      cookieFile: "/home/bitcoin/.bitcoin/regtest/.cookie"
    }
  }
};

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

    const tradeTimestamp = findLatestOfferTimestamp(trade);
    expect(tradeTimestamp.getTime()).toStrictEqual(present.getTime());
  });

  it("should return the same timestamp twice", () => {
    const trade = {
      ...btcEthTrade
    };
    const tradeTimestampBefore = findLatestOfferTimestamp(trade);

    const tradeTimestampAfter = findLatestOfferTimestamp(trade);

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

    const tradeTimestamp1 = findLatestOfferTimestamp(trade1);
    expect(tradeTimestamp1.getTime()).toStrictEqual(present.getTime());

    const tradeTimestamp2 = findLatestOfferTimestamp(trade2);
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
        asset: Asset.ether,
        quantity: new Big(110)
      }
    };

    const timestamp1 = findLatestOfferTimestamp(trade1);
    expect(timestamp1.getTime()).toStrictEqual(trade1.timestamp.getTime());

    const timestamp2 = findLatestOfferTimestamp(trade2);
    expect(timestamp2.getTime()).toStrictEqual(trade2.timestamp.getTime());
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
        asset: Asset.ether,
        quantity: new Big(110)
      }
    };

    const tradeTimestamp1 = findLatestOfferTimestamp(trade1);
    expect(tradeTimestamp1.getTime()).toStrictEqual(trade1.timestamp.getTime());

    const tradeTimestamp2 = findLatestOfferTimestamp(trade2);
    expect(tradeTimestamp2.getTime()).toStrictEqual(trade1.timestamp.getTime());
  });

  it("given different trades - should return trade timestamps", () => {
    const trade1 = {
      ...btcEthTrade
    };

    const trade2 = {
      ...ethBtcTrade
    };

    const tradeTimestamp1 = findLatestOfferTimestamp(trade1);
    expect(tradeTimestamp1.getTime()).toStrictEqual(trade1.timestamp.getTime());

    const tradeTimestamp2 = findLatestOfferTimestamp(trade2);
    expect(tradeTimestamp2.getTime()).toStrictEqual(trade2.timestamp.getTime());
  });

  class MockMarketMaker implements TradeService {
    protected trades: Offer[] = [ethBtcTrade, btcEthTrade, btcPayTrade];

    public isOfferAcceptable(_: Offer): Promise<boolean> {
      return Promise.resolve(true);
    }

    public prepareOffersToPublish() {
      return Promise.resolve(this.trades);
    }
  }

  it("Should return the trades and ledgers information", async () => {
    const mockMarketMaker = new MockMarketMaker();

    const apiCall = getOffersToPublishRoute(
      mockMarketMaker,
      bitcoinConfig,
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

    const expected: ToPublish = {
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
        },
        {
          buy: {
            asset: "bitcoin",
            ledger: "bitcoin",
            quantity: "1"
          },
          protocol: "rfc003",
          sell: {
            asset: "PAY",
            ledger: "ethereum",
            quantity: "1000",
            contract: {
              address: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
              decimals: 18
            }
          },
          timestamp: btcPayTrade.timestamp.toISOString()
        }
      ]
    };

    await apiCall(req as any, res as any);
    let result = res.sendCalledWith;
    expect(result).toBeDefined();
    expect(result).toEqual(expected);

    await apiCall(req as any, res as any);
    result = res.sendCalledWith;
    expect(result).toBeDefined();
    expect(result).toEqual(expected);
  });
});
