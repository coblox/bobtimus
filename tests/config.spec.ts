import TOML from "@iarna/toml";
import { mnemonicToSeedSync } from "bip39";
import * as fs from "fs";
import tmp from "tmp";
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

    expect(configAfter.cndUrl).toBeDefined();
    expect(configAfter.cndUrl).toEqual(configBefore.cndUrl);
    expect(configAfter.cndListenAddress).toBeDefined();
    expect(configAfter.cndListenAddress).toEqual(configBefore.cndListenAddress);
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

  describe("bitcoin", () => {
    const minimalConfig = {
      cndUrl: "http://localhost:9939",
      lowBalanceThresholdPercentage: 0,
      maxRetries: 0,
      rates: {},
      seedWords:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon"
    };

    // for now, coreRpc details are mandatory
    // as soon as we add a 2nd way to connect bobtimus to the bitcoin network,
    // 1. this test will be obsolete
    // 2. we need a test that only one connector is specified
    it("should fail if coreRpc is not provided", () => {
      const configFn = () =>
        new Config({
          ...minimalConfig,
          ledgers: {
            bitcoin: {
              fee: {
                defaultFee: 10,
                strategy: "foo"
              },
              network: "regtest"
            }
          }
        });

      expect(configFn).toThrowError(/coreRpc details must be provided/);
    });

    it("should fail if cookieFile and password are specified", () => {
      const configFn = () =>
        new Config({
          ...minimalConfig,
          ledgers: {
            bitcoin: {
              fee: {
                defaultFee: 10,
                strategy: "foo"
              },
              network: "regtest",
              coreRpc: {
                host: "localhost",
                port: 18843,
                auth: {
                  cookieFile: "/etc/bitcoin/testnet3/.cookie",
                  password: "youwouldntknow"
                }
              }
            }
          }
        });

      expect(configFn).toThrowError(
        /specify either cookie file or username\/password/
      );
    });

    it("should fail if cookieFile and username are specified", () => {
      const configFn = () =>
        new Config({
          ...minimalConfig,
          ledgers: {
            bitcoin: {
              fee: {
                defaultFee: 10,
                strategy: "foo"
              },
              network: "regtest",
              coreRpc: {
                host: "localhost",
                port: 18843,
                auth: {
                  cookieFile: "/etc/bitcoin/testnet3/.cookie",
                  username: "bitcoin"
                }
              }
            }
          }
        });

      expect(configFn).toThrowError(
        /specify either cookie file or username\/password/
      );
    });
  });
});
