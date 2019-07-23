import Big from "big.js";
import { List } from "underscore";
import Asset from "../../src/asset";
import Ledger from "../../src/ledger";
import Balances, { BalanceLookups } from "../../src/rates/balances";
import TestnetMarketMaker from "../../src/rates/testnetMarketMaker";
import { Trade } from "../../src/rates/tradeService";

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

describe("Test the TestnetMarketMaker module", () => {
  const buyAsset = Asset.Bitcoin;
  const sellAsset = Asset.Ether;

  it("Throws when creating the Market Maker if maxFraction is greater than the publishFraction", async () => {
    const balances = await createMockBalances(1, 1);

    expect(
      () =>
        new TestnetMarketMaker(
          { rateSpread: 5, publishFraction: 100, maxFraction: 120 },
          balances
        )
    ).toThrowError(
      "MarketMaker maxFraction has to be be less than publishFraction."
    );
  });

  it("Returns the amounts to publish for buy and sell assets based on the balances, the configured published fraction and the rate spread", async () => {
    const trade: Trade = {
      timestamp: new Date(),
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.Bitcoin,
        quantity: new Big(0.525)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.Ether,
        quantity: new Big(5)
      }
    };

    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );

    const trades = await marketMaker.prepareTradesToPublishForAsset(
      buyAsset,
      sellAsset
    );
    expect(trades).toBeDefined();

    expect(trades.buy).toEqual(trade.buy); // Based on the publish fraction
    expect(trades.sell).toEqual(trade.sell);
  });

  it("Throws an error if the sell balance is zero when asking for trades to publish", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 0)
    );
    await expect(
      marketMaker.prepareTradesToPublishForAsset(Asset.Bitcoin, Asset.Ether)
    ).rejects.toThrowError(
      "Insufficient funding of asset ether to publish trades"
    );
  });

  it("Reject a trade if the sell balance is zero", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 0)
    );

    const trade = {
      timestamp: new Date(),
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.Bitcoin,
        quantity: new Big(0.1)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.Ether,
        quantity: new Big(1)
      }
    };

    await expect(marketMaker.isTradeAcceptable(trade)).resolves.toBeFalsy();
  });

  it("accepts a trade that uses the publish trades", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );
    const trades = await marketMaker.prepareTradesToPublishForAsset(
      buyAsset,
      sellAsset
    );
    expect(trades).toBeDefined();

    await expect(marketMaker.isTradeAcceptable(trades)).resolves.toBeTruthy();
  });

  it("accepts a trade that is more profitable than the acceptable rate", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );

    const trades = await marketMaker.prepareTradesToPublishForAsset(
      buyAsset,
      sellAsset
    );
    expect(trades).toBeDefined();
    trades.buy.quantity = trades.buy.quantity.add(1);

    await expect(marketMaker.isTradeAcceptable(trades)).resolves.toBeTruthy();
  });

  it("accepts a trade that uses max fraction", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 50, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );

    const trade = {
      timestamp: new Date(),
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.Bitcoin,
        quantity: new Big(1)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.Ether,
        quantity: new Big(10)
      }
    };

    await expect(marketMaker.isTradeAcceptable(trade)).resolves.toBeTruthy();
  });

  it("declines a trade whose rate is below the acceptable rate", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );

    const trade = {
      timestamp: new Date(),
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.Bitcoin,
        quantity: new Big(0.1)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.Ether,
        quantity: new Big(1.1)
      }
    };

    await expect(marketMaker.isTradeAcceptable(trade)).resolves.toBeFalsy();
  });

  it("declines a trade that sells above the max fraction", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );

    const trade = {
      timestamp: new Date(),
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.Bitcoin,
        quantity: new Big(10)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.Ether,
        quantity: new Big(11) // 10 is the max fraction: 1000/100
      }
    };

    await expect(marketMaker.isTradeAcceptable(trade)).resolves.toBeFalsy();
  });

  it("Should return the trades according to the balance", async () => {
    const expected: List<Trade> = [
      {
        timestamp: new Date(),
        buy: {
          ledger: Ledger.Bitcoin,
          asset: Asset.Bitcoin,
          quantity: new Big(0.525)
        },
        sell: {
          ledger: Ledger.Ethereum,
          asset: Asset.Ether,
          quantity: new Big(5)
        }
      },
      {
        timestamp: new Date(),
        buy: {
          ledger: Ledger.Ethereum,
          asset: Asset.Ether,
          quantity: new Big(5.25)
        },
        sell: {
          ledger: Ledger.Bitcoin,
          asset: Asset.Bitcoin,
          quantity: new Big(0.5)
        }
      }
    ];

    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );

    const trades = await marketMaker.prepareTradesToPublish();

    expect(trades[0].buy).toEqual(expected[0].buy);
    expect(trades[1].sell).toEqual(expected[1].sell);
  });
});
