import URI from "urijs";
import { Config } from "../src/config";

describe("Config tests", () => {
  it("it should parse the config and being able to prepend with configured uri", () => {
    const config = new Config("./config.toml");

    const uriString = "http://localhost:8000/swaps/rfc003";
    const uriWithPath: uri.URI = new URI(uriString);

    expect(config.prependUrlIfNeeded("/swaps/rfc003").toString()).toEqual(
      uriWithPath.toString()
    );

    expect(config.prependUrlIfNeeded("swaps/rfc003").toString()).toEqual(
      uriWithPath.toString()
    );

    expect(config.prependUrlIfNeeded(uriString).toString()).toEqual(
      uriWithPath.toString()
    );
  });
});
