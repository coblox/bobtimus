import Big from "big.js";
import Asset from "../../src/asset";
import StaticRates from "../../src/rates/staticRates";

describe("Rate tests", () => {
  it("Should consider the rate profitable when the proposed rate is less than the configured rate", async () => {
    const config = {
      ether: { bitcoin: 0.001 },
      bitcoin: { ether: 0.01 }
    };

    const rates = new StaticRates(config);

    const buyAsset = Asset.Bitcoin;
    const buyNominalAmount = new Big(0.1);
    const sellAsset = Asset.Ether;
    const sellNominalAmount = new Big(0.0009);

    const trade = {
      buyAsset,
      buyNominalAmount,
      sellAsset,
      sellNominalAmount
    };
    expect(await rates.isTradeAcceptable(trade)).toBeTruthy();
  });

  it("Should consider the rate NOT profitable when the proposed rate is greater than the configured rate", async () => {
    const config = {
      ether: { bitcoin: 0.001 },
      bitcoin: { ether: 0.01 }
    };

    const rates = new StaticRates(config);

    const buyAsset = Asset.Bitcoin;
    const buyNominalAmount = new Big(0.1);
    const sellAsset = Asset.Ether;
    const sellNominalAmount = new Big(0.0011);

    const trade = {
      buyAsset,
      buyNominalAmount,
      sellAsset,
      sellNominalAmount
    };
    expect(await rates.isTradeAcceptable(trade)).toBeFalsy();
  });

  it("Should return the amounts for configured rates", async () => {
    const amountsMock = {
      amounts: [
        {
          timestamp: "2019-07-15T21:45:59.12",
          protocol: "rfc003",
          buy: {
            ledger: "ethereum",
            asset: "ether",
            quantity: "1"
          },
          sell: {
            ledger: "bitcoin",
            asset: "bitcoin",
            quantity: "0.001"
          }
        },
        {
          timestamp: "2019-07-15T21:11:13.02",
          buy: {
            ledger: "bitcoin",
            asset: "bitcoin",
            quantity: "1"
          },
          sell: {
            ledger: "ethereum",
            asset: "ether",
            quantity: "0.01"
          },
          protocol: "rfc003"
        }
      ]
    };

    const config = {
      ether: { bitcoin: 0.001 },
      bitcoin: { ether: 0.01 }
    };

    const rates = new StaticRates(config);
    const amounts = await rates.getAmountsToPublish();

    expect(amounts[0].buy).toEqual(amountsMock.amounts[0].buy);
    expect(amounts[1].sell).toEqual(amountsMock.amounts[1].sell);
  });
});
