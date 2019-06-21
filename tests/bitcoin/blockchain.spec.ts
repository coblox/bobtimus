import { Satoshis } from "../../src/bitcoin/blockchain";

describe("Test bitcoin blockchain module", () => {
  it("Correctly parses string of float Bitcoin to Satoshis", () => {
    const sats = Satoshis.fromBitcoin("00010.00009");

    expect(sats.getSatoshis()).toEqual(1000009000);
  });

  it("Correctly parses float Bitcoin to Satoshis", () => {
    const sats = Satoshis.fromBitcoin(123.12345678);

    expect(sats.getSatoshis()).toEqual(12312345678);
  });

  it("rounds down if float bitcoin is sub-satoshi", () => {
    const sats = Satoshis.fromBitcoin(123.123456789);

    expect(sats.getSatoshis()).toEqual(12312345678);
  });
});
