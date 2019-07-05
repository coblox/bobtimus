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

    const tradeAmounts = {
      buyAsset,
      buyNominalAmount,
      sellAsset,
      sellNominalAmount
    };
    expect(await rates.isTradeAcceptable(tradeAmounts)).toBeTruthy();
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

    const tradeAmounts = {
      buyAsset,
      buyNominalAmount,
      sellAsset,
      sellNominalAmount
    };
    expect(await rates.isTradeAcceptable(tradeAmounts)).toBeFalsy();
  });
});
