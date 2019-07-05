import TOML from "@iarna/toml";
import { mnemonicToSeedSync } from "bip39";
import * as fs from "fs";
import tmp from "tmp";
import URI from "urijs";
import { BitcoinConfig, Config, EthereumConfig } from "../src/config";

/// Copies the file to not modify a file tracked by git when running the test
/// Uses a dedicated folder to make the cleanup easier
function copyConfigFile(source: string) {
  const dir = tmp.dirSync();
  const filename = dir.name + "/config.toml";

  fs.copyFileSync(source, filename);

  return { dir: dir.name, filename };
}

/// Clean up files created for the test
function cleanUpFiles(dir: string) {
  // Empty the folder first
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      const filePath = dir + "/" + file;
      fs.unlinkSync(filePath);
    });
    fs.rmdirSync(dir);
  }
}

describe("Config tests", () => {
  it("should parse the config and being able to prepend with configured uri", () => {
    const config = Config.fromFile("./tests/configs/staticRates.toml");

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

  it("should write seed words in the config file if they are not present, keeping same parameters", () => {
    const { dir, filename } = copyConfigFile(
      "./tests/configs/noSeedWords.toml"
    );
    const configBefore = TOML.parse(fs.readFileSync(filename, "utf8"));
    expect(configBefore.seedWords).toBeUndefined();

    const config = Config.fromFile(filename);

    const configAfter = TOML.parse(fs.readFileSync(filename, "utf8"));
    cleanUpFiles(dir);
    const seedWords = configAfter.seedWords as string;

    expect(seedWords).toBeDefined();
    const seed = mnemonicToSeedSync(seedWords);
    expect(config.seed).toBeDefined();
    expect(config.seed).toEqual(seed);

    expect(configAfter.comitNodeUrl).toBeDefined();
    expect(configAfter.comitNodeUrl).toEqual(configBefore.comitNodeUrl);
    expect(configAfter.rates).toBeDefined();
    expect(configAfter.rates).toEqual(configBefore.rates);
    expect(configAfter.ledgers).toBeDefined();
    expect(configAfter.ledgers).toEqual(configBefore.ledgers);
  });

  it("should parse the config with correct fee strategy selected", () => {
    const config = Config.fromFile("./tests/configs/staticRates.toml");

    expect(config.bitcoinConfig).toBeDefined();
    expect(config.ethereumConfig).toBeDefined();

    const bitcoinConfig = config.bitcoinConfig as BitcoinConfig;
    const ethereumConfig = config.ethereumConfig as EthereumConfig;

    expect(bitcoinConfig.fee).toEqual({
      defaultFee: 10,
      strategy: "hourFee"
    });
    expect(ethereumConfig.fee).toEqual({
      defaultFee: 10,
      strategy: "average"
    });
  });

  it("should parse the config with correct maximum retries", () => {
    const config = Config.fromFile("./tests/configs/staticRates.toml");
    expect(config.maxRetries).toEqual(20);
  });
});
