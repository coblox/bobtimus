import Big from "big.js";
import Asset, { toAsset, toNominalUnit } from "../src/asset";
import Ledger from "../src/ledger";

describe("Test asset", () => {
  it("Return Bitcoin asset when passed `bitcoin` asset object", () => {
    const asset = toAsset({ name: "bitcoin", quantity: "1234" });
    expect(asset).toEqual(Asset.bitcoin);
  });

  it("Return PAY asset when passed pay asset object", () => {
    const tokensCreateAsset = () => {
      return new Asset(
        "PAY",
        Ledger.Ethereum,
        "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280"
      );
    };

    const asset = toAsset(
      {
        name: "PAY",
        quantity: "1234",
        token_contract: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280"
      },
      Ledger.Ethereum,
      tokensCreateAsset
    ) as Asset;

    expect(asset.name).toEqual("PAY");
    expect(asset.contract).toEqual(
      "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280"
    );
    expect(asset.ledger).toEqual(Ledger.Ethereum);
  });

  it("Convert satoshis to Bitcoin", () => {
    const sats = new Big("100000000");
    expect(toNominalUnit(Asset.bitcoin, sats)).toEqual(new Big(1));
  });
});
