import Big from "big.js";
import { getBuyDivBySellRate, isProfitable } from "../src/rates";

describe("Rate tests", () => {
  it("Should consider rate profitable when the base asset of the configured rate is the buy asset", () => {
    const rates = { ether: { bitcoin: { sell: 0.001, buy: 0.01 } } };
    const buyAsset = { name: "bitcoin", quantity: new Big("0.002") };
    const sellAsset = { name: "ether", quantity: new Big(1) };

    const acceptableRate = getBuyDivBySellRate(
      rates,
      buyAsset.name,
      sellAsset.name
    );
    expect(acceptableRate).toBeDefined();
    expect(
      // @ts-ignore: we know acceptableRate is defined
      isProfitable(buyAsset.quantity, sellAsset.quantity, acceptableRate)
    ).toBeTruthy();
  });

  it("Should consider rate NOT profitable when the base asset of the configured rate is the buy asset", () => {
    const rates = { ether: { bitcoin: { sell: 0.001, buy: 0.01 } } };

    const buyAsset = { name: "bitcoin", quantity: new Big("0.0008") };
    const sellAsset = { name: "ether", quantity: new Big(1) };

    const acceptableRate = getBuyDivBySellRate(
      rates,
      buyAsset.name,
      sellAsset.name
    );
    expect(acceptableRate).toBeDefined();
    expect(
      // @ts-ignore: we know acceptableRate is defined
      isProfitable(buyAsset.quantity, sellAsset.quantity, acceptableRate)
    ).toBeFalsy();
  });

  it("Should consider rate profitable when the base asset of the configured rate is the sell asset", () => {
    const rates = { ether: { bitcoin: { sell: 0.001, buy: 0.01 } } };

    const buyAsset = { name: "ether", quantity: new Big(1) };
    const sellAsset = { name: "bitcoin", quantity: new Big("0.009") };

    const acceptableRate = getBuyDivBySellRate(
      rates,
      buyAsset.name,
      sellAsset.name
    );
    expect(acceptableRate).toBeDefined();

    expect(
      // @ts-ignore: we know acceptableRate is defined
      isProfitable(buyAsset.quantity, sellAsset.quantity, acceptableRate)
    ).toBeTruthy();
  });

  it("Should consider rate NOT profitable when the base asset of the configured rate is the sell asset", () => {
    const rates = { ether: { bitcoin: { sell: 0.001, buy: 0.01 } } };

    const buyAsset = { name: "ether", quantity: new Big(1) };
    const sellAsset = { name: "bitcoin", quantity: new Big("0.02") };

    const acceptableRate = getBuyDivBySellRate(
      rates,
      buyAsset.name,
      sellAsset.name
    );
    expect(acceptableRate).toBeDefined();
    expect(
      // @ts-ignore: we know acceptableRate is defined
      isProfitable(buyAsset.quantity, sellAsset.quantity, acceptableRate)
    ).toBeFalsy();
  });
});
