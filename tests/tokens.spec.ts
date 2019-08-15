import { isEqual } from "underscore";
import Asset from "../src/asset";
import Ledger from "../src/ledger";
import Tokens, { TokensConfig } from "../src/tokens";

const tokensConfig: TokensConfig = {
  ethereum: {
    PAY: {
      contract: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
      decimals: 18
    },
    TENX: {
      contract: "0x515bA0a2E286AF10115284F151cF398688A69170",
      decimals: 18
    }
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
          PAY: {
            contract: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
            decimals: 18
          },
          PAY2: {
            contract: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
            decimals: 18
          }
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

  it("Create an Asset with pre-configured symbol when a configured contract address is passed", () => {
    const tokens = new Tokens(tokensConfig);
    const payAsset = tokens.createAsset(
      Ledger.Ethereum,
      "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280"
    ) as Asset;
    expect(payAsset.name).toEqual("PAY");
  });

  it("Returns undefined when an unknown contract address is passed", () => {
    const tokens = new Tokens(tokensConfig);
    const payAsset = tokens.createAsset(
      Ledger.Ethereum,
      "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2"
    );
    expect(payAsset).toBeUndefined();
  });

  it("With a Tokens instance created from a file, create an Asset with pre-configured symbol when a configured contract address is passed", () => {
    const tokens = Tokens.fromFile("./tests/configs/tokens.toml") as Tokens;
    const payAsset = tokens.createAsset(
      Ledger.Ethereum,
      "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280"
    ) as Asset;
    expect(payAsset.name).toEqual("PAY");
    expect(payAsset!.contract!.decimals).toEqual(18);
  });

  it("Return undefined when creating Tokens instance from file if the file is not present", () => {
    const tokens = Tokens.fromFile("./tests/configs/doesNotExists.toml");
    expect(tokens).toBeUndefined();
  });

  it("Returns all configured tokens", () => {
    const tokens = new Tokens(tokensConfig);
    const payAsset = new Asset("PAY", Ledger.Ethereum, {
      address: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
      decimals: 18
    });
    const tenxAsset = new Asset("TENX", Ledger.Ethereum, {
      address: "0x515bA0a2E286AF10115284F151cF398688A69170",
      decimals: 18
    });

    const assets = tokens.getAssets(Ledger.Ethereum);

    expect(
      isEqual(tenxAsset, assets[0]) || isEqual(payAsset, assets[0])
    ).toBeTruthy();
    expect(
      isEqual(tenxAsset, assets[1]) || isEqual(payAsset, assets[1])
    ).toBeTruthy();
  });
});
