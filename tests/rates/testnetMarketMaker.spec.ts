import Big from "big.js";
import Asset from "../../src/asset";
import Balances, { BalanceLookups } from "../../src/rates/balances";
import TestnetMarketMaker from "../../src/rates/testnetMarketMaker";

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
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );
    const amounts = await marketMaker.calculateAmountsToPublish(
      buyAsset,
      sellAsset
    );
    expect(amounts).toBeDefined();
    const {
      // @ts-ignore: amounts are defined
      buyNominalAmount,
      // @ts-ignore: amounts are defined
      sellNominalAmount
    } = amounts;
    expect(sellNominalAmount).toEqual(new Big(5)); // Based on the publish fraction
    expect(buyNominalAmount).toEqual(new Big(0.525));
  });

  it("Throws an error if the sell balance is zero when asking for amounts to publish", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 0)
    );
    await expect(
      marketMaker.calculateAmountsToPublish(Asset.Bitcoin, Asset.Ether)
    ).rejects.toThrowError(
      "Insufficient funding of asset ether to publish amounts"
    );
  });

  it("Reject a trade if the sell balance is zero", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 0)
    );

    await expect(
      marketMaker.isTradeAcceptable({
        buyAsset: Asset.Bitcoin,
        buyNominalAmount: new Big(0.1),
        sellAsset: Asset.Ether,
        sellNominalAmount: new Big(1)
      })
    ).resolves.toBeFalsy();
  });

  it("accepts a trade that uses the publish amounts", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );
    const amounts = await marketMaker.calculateAmountsToPublish(
      buyAsset,
      sellAsset
    );
    expect(amounts).toBeDefined();
    const {
      // @ts-ignore: amounts are defined
      buyNominalAmount,
      // @ts-ignore: amounts are defined
      sellNominalAmount
    } = amounts;
    await expect(
      marketMaker.isTradeAcceptable({
        buyAsset,
        buyNominalAmount,
        sellAsset,
        sellNominalAmount
      })
    ).resolves.toBeTruthy();
  });

  it("accepts a trade that is more profitable than the acceptable rate", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );

    const amounts = await marketMaker.calculateAmountsToPublish(
      buyAsset,
      sellAsset
    );
    expect(amounts).toBeDefined();
    const {
      // @ts-ignore: amounts are defined
      buyNominalAmount,
      // @ts-ignore: amounts are defined
      sellNominalAmount
    } = amounts;

    await expect(
      marketMaker.isTradeAcceptable({
        buyAsset,
        buyNominalAmount: buyNominalAmount.add(1),
        sellAsset,
        sellNominalAmount
      })
    ).resolves.toBeTruthy();
  });

  it("accepts a trade that uses max fraction", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 50, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );

    await expect(
      marketMaker.isTradeAcceptable(
        {
          buyAsset,
          buyNominalAmount: new Big(1),
          sellAsset,
          sellNominalAmount: new Big(10)
        } // 10 is the max fraction: 1000/100
      )
    ).resolves.toBeTruthy();
  });

  it("declines a trade whose rate is below the acceptable rate", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );

    await expect(
      marketMaker.isTradeAcceptable({
        buyAsset,
        buyNominalAmount: new Big(0.1),
        sellAsset,
        sellNominalAmount: new Big(1.1)
      })
    ).resolves.toBeFalsy();
  });

  it("declines a trade that sells above the max fraction", async () => {
    const marketMaker = new TestnetMarketMaker(
      { rateSpread: 5, publishFraction: 200, maxFraction: 100 },
      await createMockBalances(100, 1000)
    );

    await expect(
      marketMaker.isTradeAcceptable(
        {
          buyAsset,
          buyNominalAmount: new Big(10),
          sellAsset,
          sellNominalAmount: new Big(11)
        } // 10 is the max fraction: 1000/100
      )
    ).resolves.toBeFalsy();
  });
});
