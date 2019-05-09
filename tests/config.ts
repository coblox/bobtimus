import { Config } from "../src/config";
import { expect } from "chai";
import URI from "urijs";

describe("Config tests", () => {
  it("it should parse the config and being able to prepend with configured uri", () => {
    let config = new Config("./config.toml");

    let uriWithPath: uri.URI = new URI("http://localhost:8000/swaps/erfc003");

    expect(config.prependUrlIfNeeded("/swaps/erfc003").toString()).to.equal(
      uriWithPath.toString()
    );

    expect(config.prependUrlIfNeeded("swaps/erfc003").toString()).to.equal(
      uriWithPath.toString()
    );
  });
});
