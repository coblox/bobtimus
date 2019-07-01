import Big from "big.js";
import Asset from "../../src/asset";
import TestnetMarketMaker, {
  BalanceLookups
} from "../../src/rates/testnetMarketMaker";

function createMockBalanceLookups(
  bitcoinBalance: number,
  etherBalance: number
) {
  const mockBalanceLookups: BalanceLookups = {
    bitcoin: () => new Big(bitcoinBalance),
    ether: () => new Big(etherBalance)
  };

  return mockBalanceLookups;
}

describe("Test the TestnetMarketMaker module", () => {
  const buyAsset = Asset.Bitcoin;
  const sellAsset = Asset.Ether;

  it("Throws when creating the Market Maker if maxNth is greater or equal to the publishedNth", () => {
    expect(() => {
      // @ts-ignore: the returned object is not to be used
      const marketMaker = new TestnetMarketMaker(
        5,
        100,
        120,
        createMockBalanceLookups(1, 1)
      );
    }).toThrow();
  });

  it("Returns the amounts to publish for buy and sell assets based on the balances, the configured published fraction and the rate spread", () => {
    const marketMaker = new TestnetMarketMaker(
      5,
      200,
      100,
      createMockBalanceLookups(100, 1000)
    );
    const {
      buyNominalAmount,
      sellNominalAmount
    } = marketMaker.getAmountsToPublish(Asset.Bitcoin, Asset.Ether);

    expect(sellNominalAmount.toFixed()).toEqual("5"); // Based on the publish fraction
    expect(buyNominalAmount.toFixed()).toEqual("0.525");
  });

  it("Throws an error if the sell balance is zero when asking for amounts to publish", () => {
    const marketMaker = new TestnetMarketMaker(
      5,
      200,
      100,
      createMockBalanceLookups(100, 0)
    );
    expect(() => {
      // @ts-ignore: the returned object is not used
      const {
        buyNominalAmount,
        sellNominalAmount
      } = marketMaker.getAmountsToPublish(Asset.Bitcoin, Asset.Ether);
    }).toThrowError("Insufficient funds");
  });

  it("Throws an error if the sell balance is zero when checking if the trade is acceptable", () => {
    const marketMaker = new TestnetMarketMaker(
      5,
      200,
      100,
      createMockBalanceLookups(100, 0)
    );
    expect(() => {
      // @ts-ignore: the returned object is not used
      const { buyAmount, sellAmount } = marketMaker.isTradeAcceptable({
        buyAsset: Asset.Bitcoin,
        buyNominalAmount: new Big(0.1),
        sellAsset: Asset.Ether,
        sellNominalAmount: new Big(1)
      });
    }).toThrowError("Insufficient funds");
  });

  it("accepts a trade that uses the publish amounts", () => {
    const marketMaker = new TestnetMarketMaker(
      5,
      200,
      100,
      createMockBalanceLookups(100, 1000)
    );
    const {
      buyNominalAmount,
      sellNominalAmount
    } = marketMaker.getAmountsToPublish(buyAsset, sellAsset);
    expect(
      marketMaker.isTradeAcceptable({
        buyAsset,
        buyNominalAmount,
        sellAsset,
        sellNominalAmount
      })
    ).toBeTruthy();
  });

  it("accepts a trade that is more profitable than the acceptable rate", () => {
    const marketMaker = new TestnetMarketMaker(
      5,
      200,
      100,
      createMockBalanceLookups(100, 1000)
    );

    const {
      buyNominalAmount,
      sellNominalAmount
    } = marketMaker.getAmountsToPublish(buyAsset, sellAsset);

    expect(
      marketMaker.isTradeAcceptable({
        buyAsset,
        buyNominalAmount: buyNominalAmount.add(1),
        sellAsset,
        sellNominalAmount
      })
    ).toBeTruthy();
  });

  it("accepts a trade that uses max fraction", () => {
    const marketMaker = new TestnetMarketMaker(
      50,
      200,
      100,
      createMockBalanceLookups(100, 1000)
    );

    expect(
      marketMaker.isTradeAcceptable(
        {
          buyAsset,
          buyNominalAmount: new Big(1),
          sellAsset,
          sellNominalAmount: new Big(10)
        } // 10 is the max fraction: 1000/100
      )
    ).toBeTruthy();
  });

  it("declines a trade whose rate is below the acceptable rate", () => {
    const marketMaker = new TestnetMarketMaker(
      5,
      200,
      100,
      createMockBalanceLookups(100, 1000)
    );

    expect(
      marketMaker.isTradeAcceptable({
        buyAsset,
        buyNominalAmount: new Big(0.1),
        sellAsset,
        sellNominalAmount: new Big(1.1)
      })
    ).toBeFalsy();
  });

  it("declines a trade that sells above the max fraction", () => {
    const marketMaker = new TestnetMarketMaker(
      5,
      200,
      100,
      createMockBalanceLookups(100, 1000)
    );

    expect(
      marketMaker.isTradeAcceptable(
        {
          buyAsset,
          buyNominalAmount: new Big(10),
          sellAsset,
          sellNominalAmount: new Big(11)
        } // 10 is the max fraction: 1000/100
      )
    ).toBeFalsy();
  });
});
