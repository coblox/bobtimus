import Big from "big.js";
import Asset from "../src/asset";
import { isTradeAcceptable } from "../src/ratesConfig";

describe("Rate tests", () => {
  it("Should consider the rate profitable when the adjusted sell amount is less than the configured max sell amount", () => {
    const rates = {
      ether: { bitcoin: { maxSell: 0.001 } },
      bitcoin: { ether: { maxSell: 0.01 } }
    };
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
    expect(isTradeAcceptable(tradeAmounts, rates)).toBeTruthy();
  });

  it("Should consider the rate NOT profitable when the adjusted sell amount is greater than the configured max sell amount", () => {
    const rates = {
      ether: { bitcoin: { maxSell: 0.001 } },
      bitcoin: { ether: { maxSell: 0.01 } }
    };
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
    expect(isTradeAcceptable(tradeAmounts, rates)).toBeFalsy();
  });
});
