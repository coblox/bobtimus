import Big from "big.js";
import Asset from "../../src/asset";
import Ledger from "../../src/ledger";
import { Trade } from "../../src/rates/tradeService";
import { findLatestTradeTimestamp } from "../../src/routes/tradesToPublish";

const present = new Date();
const past = new Date(present.getTime() - 5000);
const future = new Date(present.getTime() + 5000);

const btcEthTrade = {
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
} as Trade;

const ethBtcTrade = {
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
} as Trade;

describe("Trades ", () => {
  it("should return the current timestamp if nothing found", done => {
    const trade = {
      ...btcEthTrade
    };

    const tradeTimestamp = findLatestTradeTimestamp(trade);
    expect(tradeTimestamp.getTime()).toStrictEqual(present.getTime());
    done();
  });

  it("should return the same timestamp twice", async done => {
    const trade = {
      ...btcEthTrade
    };
    const tradeTimestampBefore = findLatestTradeTimestamp(trade);

    const tradeTimestampAfter = findLatestTradeTimestamp(trade);

    expect(tradeTimestampBefore.getTime()).toStrictEqual(present.getTime());
    expect(tradeTimestampAfter.getTime()).toStrictEqual(present.getTime());
    done();
  });

  it("given same amount and new timestamp on second request - should return old timestamp", async done => {
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
    done();
  });

  it("given different amounts - should return trade specific timestamp", async done => {
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
    done();
  });

  it("given different amounts but in the past - should return newer timestamp", async done => {
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
    done();
  });

  it("given different trades - should return trade timestamps", async done => {
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
    done();
  });
});
