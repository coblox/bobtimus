import Ledger from "../src/ledger";
import Tokens, { TokensConfig } from "../src/tokens";

const tokensConfig: TokensConfig = {
  ethereum: {
    PAY: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
    TENX: "0x515bA0a2E286AF10115284F151cF398688A69170"
  }
};

describe("Test Tokens", () => {
  it("Returns a Tokens instance when an empty object is passed", () => {
    const tokens = new Tokens({});
    expect(tokens).toBeDefined();
  });

  it("Returns a Tokens instance when a correctly formed object is passed", () => {
    const tokens = new Tokens(tokensConfig);
    expect(tokens).toBeDefined();
  });

  it("Throws an error if the passed config has a dupe contract address", () => {
    expect(() => {
      // @ts-ignore
      const tokens = new Tokens({
        ethereum: {
          PAY: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
          PAY2: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280"
        }
      });
    }).toThrowError(
      "Duplicate contract address detected in tokens configuration:"
    );
  });

  it("Create an Asset instance when passed a configured contract address", () => {
    const tokens = new Tokens(tokensConfig);
    const payAsset = tokens.createAsset(
      Ledger.Ethereum,
      "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280"
    );
    expect(payAsset).toBeDefined();
  });
});
