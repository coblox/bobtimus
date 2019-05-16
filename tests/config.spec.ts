import TOML from "@iarna/toml";
import { mnemonicToSeedSync } from "bip39";
import * as fs from "fs";
import URI from "urijs";
import { Config } from "../src/config";
import sleep from "./sleep";

const tempFolder = "./tests/tmp/";

/// Copies the file to not modify a file tracked by git when running the test
/// Uses a dedicated folder to make the cleanup easier
function copyConfigFile(source: string) {
  const nowMilli = Date.now();
  const tempFileName = tempFolder + nowMilli + ".toml";

  if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder);
  }
  fs.copyFileSync(source, tempFileName);

  return tempFileName;
}

/// Clean up files created for the test
function cleanUpFiles() {
  // Empty the folder first
  if (fs.existsSync(tempFolder)) {
    fs.readdirSync(tempFolder).forEach(file => {
      const filePath = tempFolder + "/" + file;
      fs.unlinkSync(filePath);
    });
    fs.rmdirSync(tempFolder);
  }
}

describe("Config tests", () => {
  it("should parse the config and being able to prepend with configured uri", () => {
    const config = new Config("./tests/config.toml");

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

  it("should write seed words in the config file if they are not present", async () => {
    const configFilePath = copyConfigFile("./tests/noSeedConfig.toml");

    const configBefore = TOML.parse(fs.readFileSync(configFilePath, "utf8"));
    expect(configBefore.seedWords).toBeUndefined();

    const config = new Config(configFilePath);

    // Wait for the new config file to be written
    await sleep(100);

    const configAfter = TOML.parse(fs.readFileSync(configFilePath, "utf8"));
    const seedWords = configAfter.seedWords as string;

    expect(config.seed).toBeDefined();
    expect(seedWords).toBeDefined();
    const seed = mnemonicToSeedSync(seedWords);
    expect(config.seed).toEqual(seed);

    cleanUpFiles();
  });

  it("should write a backup file with same parameters if no seed is present", async () => {
    const configFilePath = copyConfigFile("./tests/noSeedConfig.toml");

    const configBefore = TOML.parse(fs.readFileSync(configFilePath, "utf8"));
    expect(configBefore.seedWords).toBeUndefined();

    // @ts-ignore: we do not want to use this variable
    const config = new Config(configFilePath);

    // Wait for the new config file to be written
    await sleep(100);

    const configAfter = TOML.parse(fs.readFileSync(configFilePath, "utf8"));
    expect(configAfter.comitNodeUrl).toBeDefined();
    expect(configAfter.comitNodeUrl).toEqual(configBefore.comitNodeUrl);
    expect(configAfter.sellBitcoin).toBeDefined();
    expect(configAfter.sellBitcoin).toEqual(configBefore.sellBitcoin);
    expect(configAfter.sellEther).toBeDefined();
    expect(configAfter.sellEther).toEqual(configBefore.sellEther);
    expect(configAfter.bitcoin).toBeDefined();
    expect(configAfter.bitcoin).toEqual(configBefore.bitcoin);
    expect(configAfter.ethereum).toBeDefined();
    expect(configAfter.ethereum).toEqual(configBefore.ethereum);

    cleanUpFiles();
  });
});
