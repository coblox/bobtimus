import Asset, { toAsset } from "../src/asset";

describe("Test asset", () => {
  it("Return Bitcoin asset when passed `bitcoin` asset object", () => {
    const asset = toAsset({ name: "bitcoin", quantity: "1234" });
    expect(asset).toEqual(Asset.bitcoin);
  });
});
