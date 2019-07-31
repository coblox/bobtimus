import nock from "nock";
import URI from "urijs";
import { ComitNode, hexToBuffer } from "../src/comitNode";
import { Config } from "../src/config";

describe("Comit Node library tests", () => {
  it("should remove `0x` prefix and decode the hex string to a buffer", () => {
    const actualBuffer = hexToBuffer("0x000102030405060708090a");
    const expectedBuffer = Buffer.from("000102030405060708090a", "hex");

    expect(actualBuffer).toEqual(expectedBuffer);
  });

  it("should not modify an un-prefixed hex string and decode it to a buffer", () => {
    const actualBuffer = hexToBuffer("000102030405060708090a");
    const expectedBuffer = Buffer.from("000102030405060708090a", "hex");

    expect(actualBuffer).toEqual(expectedBuffer);
  });

  it("should return an empty buffer if the hex string is empty", () => {
    const actualBuffer = hexToBuffer("");
    const expectedBuffer = Buffer.alloc(0);

    expect(actualBuffer).toEqual(expectedBuffer);
  });

  it("throw an error if the string passed is not valid hex", () => {
    expect(() => hexToBuffer("abcdefghsdc")).toThrowError("Invalid hex string");
  });

  function mockComitMetadata(url: string) {
    const id = "QmYaEdADq9nZqNWLUXtMP9tnfjLKrwjMBuVSSNyPz2wLLd";
    const scope = nock(url)
      .get("/")
      .reply(200, {
        id,
        listen_addresses: [
          "/ip4/127.0.0.1/tcp/8011",
          "/ip6/::1/tcp/8011",
          "/ip4/192.168.1.36/tcp/8011"
        ]
      });
    return { scope, id };
  }

  it("should get cnd id", async done => {
    const config = Config.fromFile("./tests/configs/staticRates.toml");

    const { scope, id } = mockComitMetadata(config.cndUrl.href());
    const comitNode = new ComitNode(config.cndUrl);

    const metadata = await comitNode.getMetadata();
    expect(metadata.id).toEqual(id);
    expect(scope.isDone()).toBeTruthy();

    done();
  });

  it("should parse the config and being able to prepend with configured uri", () => {
    const comitNode = new ComitNode(new URI("http://localhost:8000"));

    const uriString = "http://localhost:8000/swaps/rfc003";
    const uriWithPath: uri.URI = new URI(uriString);

    expect(comitNode.prependUrlIfNeeded("/swaps/rfc003").toString()).toEqual(
      uriWithPath.toString()
    );

    expect(comitNode.prependUrlIfNeeded("swaps/rfc003").toString()).toEqual(
      uriWithPath.toString()
    );

    expect(comitNode.prependUrlIfNeeded(uriString).toString()).toEqual(
      uriWithPath.toString()
    );
  });
});
