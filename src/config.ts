import TOML from "@iarna/toml";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import BN = require("bn.js");
import * as fs from "fs";
import { getLogger } from "log4js";
import URI from "urijs";
import Ledger from "./ledger";
import { ConfigRates } from "./rates/staticRates";
import { TestnetMarketMakerConfig } from "./rates/testnetMarketMaker";

const logger = getLogger();

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
  rates: {
    static?: ConfigRates;
    marketMaker?: {
      testnet: TestnetMarketMakerConfig;
    };
  };
  ledgers: {
    bitcoin?: BitcoinConfig;
    ethereum?: EthereumConfig;
  };
  maxRetries?: number;
  lowBalanceThresholdPercentage?: number;
}

export class Config {
  public static fromFile(filePath: string) {
    const parsedConfig: any = TOML.parse(fs.readFileSync(filePath, "utf8"));
    const tomlConfig: TomlConfig = parsedConfig;

    if (!tomlConfig.seedWords) {
      logger.info("Generating seed words");
      const seedWords = generateMnemonic(256);
      Object.assign(tomlConfig, { seedWords });
      backupAndWriteConfig(filePath, tomlConfig);
    }

    return new Config(tomlConfig);
  }

  public comitNodeUrl: string;
  public staticRates?: ConfigRates;
  public testnetMarketMaker?: TestnetMarketMakerConfig;
  public seed: Buffer;
  public bitcoinConfig?: BitcoinConfig;
  public ethereumConfig?: EthereumConfig;
  public maxRetries: number;
  public lowBalanceThresholdPercentage: number;

  constructor(tomlConfig: TomlConfig) {
    this.maxRetries = tomlConfig.maxRetries ? tomlConfig.maxRetries : 10;
    this.lowBalanceThresholdPercentage = tomlConfig.lowBalanceThresholdPercentage
      ? tomlConfig.lowBalanceThresholdPercentage
      : 20;

    const ledgers = throwIfFalse(tomlConfig, "ledgers");
    this.bitcoinConfig = ledgers.bitcoin;
    this.ethereumConfig = ledgers.ethereum;

    const rates = tomlConfig.rates;
    this.staticRates = rates.static;
    this.testnetMarketMaker = rates.marketMaker
      ? rates.marketMaker.testnet
      : undefined;

    this.comitNodeUrl = throwIfFalse(tomlConfig, "comitNodeUrl");
    this.seed = mnemonicToSeedSync(throwIfFalse(tomlConfig, "seedWords"));
  }

  public prependUrlIfNeeded(path: string): uri.URI {
    const uriPath = new URI(path);
    return uriPath.is("relative")
      ? new URI(this.comitNodeUrl).segment(path)
      : uriPath;
  }

  public isSupportedAndConfigured(ledger: Ledger): boolean {
    let isValid;
    switch (ledger) {
      case Ledger.Bitcoin:
        isValid = typeof this.bitcoinConfig === "object";
        break;
      case Ledger.Ethereum:
        isValid = typeof this.ethereumConfig === "object";
        break;
      default:
        isValid = false;
    }

    if (!isValid) {
      logger.warn(`Invalid configuration for ledger ${ledger}`);
    }

    return isValid;
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

function throwIfFalse(obj: any, prop: string) {
  if (!obj[prop]) {
    logger.error(`${prop} must be present in the config file`);
    throw new Error(`${prop} must be present in the config file`);
  }
  return obj[prop];
}
