import TOML from "@iarna/toml";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import BN = require("bn.js");
import debug from "debug";
import * as fs from "fs";
import URI from "urijs";
import { Rates } from "./rates";

const log = debug("bobtimus:config");

export interface BitcoinConfig {
  type: "coreRpc";
  rpcUsername?: string;
  rpcPassword?: string;
  rpcHost?: string;
  rpcPort?: number;
  network: string;
  fee: {
    defaultFee: number;
    strategy: string;
  };
}

export interface EthereumConfig {
  fee: {
    defaultFee: BN;
    strategy: string;
  };
  web3Endpoint: string;
}

export interface TomlConfig {
  comitNodeUrl: string;
  seedWords?: string;
  rates: Rates;
  ledgers: {
    bitcoin?: BitcoinConfig;
    ethereum?: EthereumConfig;
  };
  maxRetries?: number;
}

export class Config {
  public static fromFile(filePath: string) {
    const parsedConfig: any = TOML.parse(fs.readFileSync(filePath, "utf8"));
    const tomlConfig: TomlConfig = parsedConfig;

    if (!tomlConfig.seedWords) {
      log!("Generating seed words");
      const seedWords = generateMnemonic(256);
      Object.assign(tomlConfig, { seedWords });
      backupAndWriteConfig(filePath, tomlConfig);
    }

    return new Config(tomlConfig);
  }

  public comitNodeUrl: string;
  public rates: Rates;
  public seed: Buffer;
  public bitcoinConfig?: BitcoinConfig;
  public ethereumConfig?: EthereumConfig;
  public maxRetries: number;

  constructor(tomlConfig: TomlConfig) {
    this.maxRetries = tomlConfig.maxRetries ? tomlConfig.maxRetries : 10;

    const ledgers = throwIfFalse(tomlConfig, "ledgers");
    this.bitcoinConfig = ledgers.bitcoin;
    this.ethereumConfig = ledgers.ethereum;

    validateRates(tomlConfig.rates);
    this.rates = tomlConfig.rates;

    this.comitNodeUrl = throwIfFalse(tomlConfig, "comitNodeUrl");
    this.seed = mnemonicToSeedSync(throwIfFalse(tomlConfig, "seedWords"));
  }

  public prependUrlIfNeeded(path: string): uri.URI {
    const uriPath = new URI(path);
    return uriPath.is("relative")
      ? new URI(this.comitNodeUrl).segment(path)
      : uriPath;
  }

  public isSupported(ledgerName: string, assetName: string) {
    switch (ledgerName + assetName) {
      case "bitcoinbitcoin":
        return typeof this.bitcoinConfig === "object";
      case "ethereumether":
        return typeof this.ethereumConfig === "object";
      default:
        return false;
    }
  }
}

function backupAndWriteConfig(filePath: string, config: TomlConfig) {
  const now = new Date();
  const datePostfix =
    now.getFullYear().toString() +
    now.getMonth().toString() +
    now.getDay().toString() +
    now.getHours().toString() +
    now.getSeconds().toString();
  const backupPath = filePath + ".backup." + datePostfix;
  fs.copyFileSync(filePath, backupPath);

  const jsonMap: any = config;
  const toml = TOML.stringify(jsonMap);
  fs.writeFileSync(filePath, toml);
}

function validateRates(rates: Rates) {
  if (
    rates.bitcoin &&
    rates.bitcoin.ether &&
    rates.ether &&
    rates.ether.bitcoin
  ) {
    throw new Error(
      "bitcoin/ether pair must be configured only once in a [rates.ether.bitcoin] XOR [rates.bitcoin.ether] section"
    );
  }

  const pairs = [];

  if (rates.bitcoin && rates.bitcoin.ether) {
    pairs.push(rates.bitcoin.ether);
  }
  if (rates.ether && rates.ether.bitcoin) {
    pairs.push(rates.ether.bitcoin);
  }

  pairs.forEach((pair: any) => {
    if (!pair.sell && !pair.buy) {
      throw new Error(
        `buy or sell rate (or both) needs to be present in configuration file for ${pair}`
      );
    }

    if (pair.sell > pair.buy) {
      log(
        `Your sell rate is higher than your buy rate, you are unlikely to make money on ${pair}`
      );
    }
  });
}

function throwIfFalse(obj: any, prop: string) {
  if (!obj[prop]) {
    throw new Error(`${prop} must be present in the config file`);
  }
  return obj[prop];
}
