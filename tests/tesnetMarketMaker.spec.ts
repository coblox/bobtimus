import { TestnetMarketMaker } from "../src/testnetMarketMaker";

describe("Test the TestnetMarketMaker module", () => {
  it("Throws when creating the Market Maker if maxNth is greater or equal to the publishedNth", () => {
    expect(() => {
      // @ts-ignore: the returned object is not to be used
      const marketMaker = new TestnetMarketMaker(5, 100, 120);
    }).toThrow();
  });

  it("Returns the amounts to publish for buy and sell assets based on the balances, the configured published fraction and the rate spread", () => {
    const marketMaker = new TestnetMarketMaker(5, 200, 100);
    const { buyAmount, sellAmount } = marketMaker.getAmountsToPublish({
      buyBalance: 100,
      sellBalance: 1000
    });

    expect(sellAmount).toEqual(5); // Based on the publish fraction
    expect(buyAmount).toEqual(0.525);
  });

  it("Throws an error if the sell balance is zero when asking for amounts to publish", () => {
    const marketMaker = new TestnetMarketMaker(5, 200, 100);
    expect(() => {
      // @ts-ignore: the returned object is not used
      const { buyAmount, sellAmount } = marketMaker.getAmountsToPublish({
        buyBalance: 100,
        sellBalance: 0
      });
    }).toThrowError("Insufficient funds");
  });

  it("Throws an error if the sell balance is zero when checking if the trade is acceptable", () => {
    const marketMaker = new TestnetMarketMaker(5, 200, 100);
    expect(() => {
      // @ts-ignore: the returned object is not used
      const { buyAmount, sellAmount } = marketMaker.isTradeAcceptable(
        {
          buyAsset: "bitcoin",
          buyAmount: 0.1,
          sellAsset: "ether",
          sellAmount: 1
        },
        { buyBalance: 100, sellBalance: 0 }
      );
    }).toThrowError("Insufficient funds");
  });

  it("accepts a trade that uses the publish amounts", () => {
    const marketMaker = new TestnetMarketMaker(5, 200, 100);
    const buyAsset = "bitcoin";
    const sellAsset = "ether";
    const balances = { buyBalance: 100, sellBalance: 1000 };
    const { buyAmount, sellAmount } = marketMaker.getAmountsToPublish(balances);

    expect(
      marketMaker.isTradeAcceptable(
        { buyAsset, buyAmount, sellAsset, sellAmount },
        balances
      )
    ).toBeTruthy();
  });

  it("accepts a trade that is more profitable than the acceptable rate", () => {
    const marketMaker = new TestnetMarketMaker(5, 200, 100);
    const buyAsset = "bitcoin";
    const sellAsset = "ether";
    const balances = { buyBalance: 100, sellBalance: 1000 };

    const { buyAmount, sellAmount } = marketMaker.getAmountsToPublish(balances);

    console.log(buyAmount, sellAmount);

    expect(
      marketMaker.isTradeAcceptable(
        { buyAsset, buyAmount: buyAmount + 1, sellAsset, sellAmount },
        balances
      )
    ).toBeTruthy();
  });

  it("accepts a trade that uses max fraction", () => {
    const marketMaker = new TestnetMarketMaker(5, 200, 100);
    const buyAsset = "bitcoin";
    const sellAsset = "ether";
    const balances = { buyBalance: 100, sellBalance: 1000 };

    expect(
      marketMaker.isTradeAcceptable(
        { buyAsset, buyAmount: 1, sellAsset, sellAmount: 10 }, // 10 is the max fraction: 1000/100
        balances
      )
    ).toBeTruthy();
  });

  it("declines a trade whose rate is below the acceptable rate", () => {
    const marketMaker = new TestnetMarketMaker(5, 200, 100);
    const buyAsset = "bitcoin";
    const sellAsset = "ether";
    const balances = { buyBalance: 100, sellBalance: 1000 };

    expect(
      marketMaker.isTradeAcceptable(
        { buyAsset, buyAmount: 0.1, sellAsset, sellAmount: 1.1 },
        balances
      )
    ).toBeFalsy();
  });

  it("declines a trade that sells above the max fraction", () => {
    const marketMaker = new TestnetMarketMaker(5, 200, 100);
    const buyAsset = "bitcoin";
    const sellAsset = "ether";
    const balances = { buyBalance: 100, sellBalance: 1000 };

    expect(
      marketMaker.isTradeAcceptable(
        { buyAsset, buyAmount: 10, sellAsset, sellAmount: 11 }, // 10 is the max fraction: 1000/100
        balances
      )
    ).toBeFalsy();
  });
});
