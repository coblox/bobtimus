import Big from "big.js";
import { List } from "underscore";
import Asset from "../../src/asset";
import Ledger from "../../src/ledger";
import Balances, { BalanceLookups } from "../../src/rates/balances";
import TestnetMarketMaker from "../../src/rates/testnetMarketMaker";
import { Offer } from "../../src/rates/tradeService";
import Tokens from "../../src/tokens";

async function createMockBalances(
  bitcoinBalance: number,
  etherBalance: number,
  payBalance?: number
) {
  const payAsset = new Asset("PAY", Ledger.Ethereum, {
    address: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
    decimals: 18
  });

  const balanceLookups = new BalanceLookups([
    [Asset.bitcoin.toMapKey(), () => Promise.resolve(new Big(bitcoinBalance))],
    [Asset.ether.toMapKey(), () => Promise.resolve(new Big(etherBalance))],
    [
      payAsset.toMapKey(),
      () => Promise.resolve(new Big(payBalance ? payBalance : 0))
    ]
  ]);

  return Balances.new(20, balanceLookups);
}

const payAsset = new Asset("PAY", Ledger.Ethereum, {
  address: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
  decimals: 18
});

describe("Test the TestnetMarketMaker module", () => {
  const buyAsset = Asset.bitcoin;
  const sellAsset = Asset.ether;

  it("Throws when creating the Market Maker if maxFraction is greater than the publishFraction", async () => {
    const balances = await createMockBalances(1, 1);

    expect(
      () =>
        new TestnetMarketMaker(
          { rateSpread: 5, publishFraction: 100, maxFraction: 120 },
          balances,
          () => []
        )
    ).toThrowError(
      "MarketMaker maxFraction has to be be less than publishFraction."
    );
  });

  it("Returns the amounts to publish for buy and sell assets based on the balances, the configured published fraction and the rate spread", async () => {
    const offer: Offer = {
      timestamp: new Date(),
      protocol: "rfc003",
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.bitcoin,
        quantity: new Big(0.525)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.ether,
        quantity: new Big(5)
      }
    };

    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000),
      () => []
    );

    const offers = await marketMaker.prepareOffersToPublishForAsset(
      buyAsset,
      sellAsset
    );
    expect(offers).toBeDefined();

    expect(offers.buy).toEqual(offer.buy); // Based on the publish fraction
    expect(offers.sell).toEqual(offer.sell);
  });

  it("Throws an error if the sell balance is zero when asking for trades to publish", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 0),
      () => []
    );
    await expect(
      marketMaker.prepareOffersToPublishForAsset(Asset.bitcoin, Asset.ether)
    ).rejects.toThrowError(
      "Insufficient funding of asset ether to publish trades"
    );
  });

  it("Reject a trade if the sell balance is zero", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 0),
      () => []
    );

    const offer: Offer = {
      timestamp: new Date(),
      protocol: "rfc003",
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.bitcoin,
        quantity: new Big(0.1)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.ether,
        quantity: new Big(1)
      }
    };

    await expect(marketMaker.isOfferAcceptable(offer)).resolves.toBeFalsy();
  });

  it("accepts a trade that uses the publish trades", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000),
      () => []
    );
    const offers = await marketMaker.prepareOffersToPublishForAsset(
      buyAsset,
      sellAsset
    );
    expect(offers).toBeDefined();

    await expect(marketMaker.isOfferAcceptable(offers)).resolves.toBeTruthy();
  });

  it("accepts a trade that is more profitable than the acceptable rate", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000),
      () => []
    );

    const offers = await marketMaker.prepareOffersToPublishForAsset(
      buyAsset,
      sellAsset
    );
    expect(offers).toBeDefined();
    offers.buy.quantity = offers.buy.quantity.add(1);

    await expect(marketMaker.isOfferAcceptable(offers)).resolves.toBeTruthy();
  });

  it("accepts a trade that uses max fraction", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 50, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000),
      () => []
    );

    const trade: Offer = {
      timestamp: new Date(),
      protocol: "rfc003",
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.bitcoin,
        quantity: new Big(1)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.ether,
        quantity: new Big(10)
      }
    };

    await expect(marketMaker.isOfferAcceptable(trade)).resolves.toBeTruthy();
  });

  it("declines a trade whose rate is below the acceptable rate", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000),
      () => []
    );

    const trade: Offer = {
      timestamp: new Date(),
      protocol: "rfc003",
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.bitcoin,
        quantity: new Big(0.1)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.ether,
        quantity: new Big(1.1)
      }
    };

    await expect(marketMaker.isOfferAcceptable(trade)).resolves.toBeFalsy();
  });

  it("declines a trade that sells above the max fraction", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000),
      () => []
    );

    const trade: Offer = {
      timestamp: new Date(),
      protocol: "rfc003",
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.bitcoin,
        quantity: new Big(10)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.ether,
        quantity: new Big(11) // 10 is the max fraction: 1000/100
      }
    };

    await expect(marketMaker.isOfferAcceptable(trade)).resolves.toBeFalsy();
  });

  it("Should return the trades according to the balance", async () => {
    const expected: List<Offer> = [
      {
        timestamp: new Date(),
        protocol: "rfc003",
        buy: {
          ledger: Ledger.Bitcoin,
          asset: Asset.bitcoin,
          quantity: new Big(0.525)
        },
        sell: {
          ledger: Ledger.Ethereum,
          asset: Asset.ether,
          quantity: new Big(5)
        }
      },
      {
        timestamp: new Date(),
        protocol: "rfc003",
        buy: {
          ledger: Ledger.Ethereum,
          asset: Asset.ether,
          quantity: new Big(5.25)
        },
        sell: {
          ledger: Ledger.Bitcoin,
          asset: Asset.bitcoin,
          quantity: new Big(0.5)
        }
      }
    ];

    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000),
      () => []
    );

    const trades = await marketMaker.prepareOffersToPublish();

    expect(trades[0].buy).toEqual(expected[0].buy);
    expect(trades[1].sell).toEqual(expected[1].sell);
  });

  it("Returns the amounts to publish for buy and sell assets with an ERC20 asset based on the balances, the configured published fraction and the rate spread", async () => {
    const offer: Offer = {
      timestamp: new Date(),
      protocol: "rfc003",
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.bitcoin,
        quantity: new Big(0.525)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: payAsset,
        quantity: new Big(40)
      }
    };

    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000, 8000),
      () => []
    );

    const offersToPublish = await marketMaker.prepareOffersToPublishForAsset(
      buyAsset,
      payAsset
    );
    expect(offersToPublish).toBeDefined();
    expect(offersToPublish.buy).toEqual(offer.buy); // Based on the publish fraction
    expect(offersToPublish.sell).toEqual(offer.sell);
  });

  it("Should return the trades, including ERC20, according to the balance", async () => {
    const expected: List<Offer> = [
      {
        timestamp: new Date(),
        protocol: "rfc003",
        buy: {
          ledger: Ledger.Bitcoin,
          asset: Asset.bitcoin,
          quantity: new Big(0.525)
        },
        sell: {
          ledger: Ledger.Ethereum,
          asset: Asset.ether,
          quantity: new Big(5)
        }
      },
      {
        timestamp: new Date(),
        protocol: "rfc003",
        buy: {
          ledger: Ledger.Ethereum,
          asset: Asset.ether,
          quantity: new Big(5.25)
        },
        sell: {
          ledger: Ledger.Bitcoin,
          asset: Asset.bitcoin,
          quantity: new Big(0.5)
        }
      },
      {
        timestamp: new Date(),
        protocol: "rfc003",
        buy: {
          ledger: Ledger.Bitcoin,
          asset: Asset.bitcoin,
          quantity: new Big(0.525)
        },
        sell: {
          ledger: Ledger.Ethereum,
          asset: payAsset,
          quantity: new Big(50)
        }
      },
      {
        timestamp: new Date(),
        protocol: "rfc003",
        buy: {
          ledger: Ledger.Ethereum,
          asset: payAsset,
          quantity: new Big(52.5)
        },
        sell: {
          ledger: Ledger.Bitcoin,
          asset: Asset.bitcoin,
          quantity: new Big(0.5)
        }
      }
    ];

    const tokens = new Tokens({
      ethereum: {
        PAY: {
          contract: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
          decimals: 18
        }
      }
    });

    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000, 10000),
      tokens.getAssets.bind(tokens)
    );

    const offers = await marketMaker.prepareOffersToPublish();

    expect(offers.length).toEqual(4);
    expect(offers[0].buy).toEqual(expected[0].buy);
    expect(offers[0].sell).toEqual(expected[0].sell);
    expect(offers[1].buy).toEqual(expected[1].buy);
    expect(offers[1].sell).toEqual(expected[1].sell);
    expect(offers[2].buy).toEqual(expected[2].buy);
    expect(offers[2].sell).toEqual(expected[2].sell);
    expect(offers[3].buy).toEqual(expected[3].buy);
    expect(offers[3].sell).toEqual(expected[3].sell);
  });
});
