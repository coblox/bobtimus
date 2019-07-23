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
  network: string;
  fee: {
    defaultFee: number;
    strategy: string;
  };
  coreRpc?: BitcoindCoreRpcConfig;
}

export interface BitcoindCoreRpcConfig {
  host: string;
  port: number;
  auth: BitcoindCoreRpcCookieAuth | BitcoindCoreRpcBasicAuth;
}

export interface BitcoindCoreRpcCookieAuth {
  cookieFile: string;
}

export interface BitcoindCoreRpcBasicAuth {
  username: string;
  password: string;
}

export interface EthereumConfig {
  fee: {
    defaultFee: BN;
    strategy: string;
  };
  web3Endpoint: string;
}

export interface TomlConfig {
  cndUrl: string;
  cndListenAddress?: string;
  apiPort?: number;
  seedWords: string;
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

    if (!parsedConfig.seedWords) {
      logger.info("Generating seed words");
      const seedWords = generateMnemonic(256);
      Object.assign(parsedConfig, { seedWords });

      const config = parsedConfig as TomlConfig;
      backupAndWriteConfig(filePath, config);
    }

    return new Config(parsedConfig as TomlConfig);
  }

  public cndUrl: string;
  public apiPort?: number;
  public staticRates?: ConfigRates;
  public testnetMarketMaker?: TestnetMarketMakerConfig;
  public seed: Buffer;
  public bitcoinConfig?: BitcoinConfig;
  public ethereumConfig?: EthereumConfig;
  public maxRetries: number;
  public lowBalanceThresholdPercentage: number;
  public cndListenAddress?: string;

  constructor(tomlConfig: TomlConfig) {
    this.maxRetries = tomlConfig.maxRetries ? tomlConfig.maxRetries : 10;
    this.lowBalanceThresholdPercentage = tomlConfig.lowBalanceThresholdPercentage
      ? tomlConfig.lowBalanceThresholdPercentage
      : 20;

    const ledgers = throwIfAbsent(tomlConfig, "ledgers");
    const bitcoinConfig = ledgers.bitcoin;

    if (bitcoinConfig) {
      if (!bitcoinConfig.coreRpc) {
        throw new Error(
          "For now, coreRpc details must be provided as its the only supported connector to Bitcoin"
        );
      }

      const auth = throwIfAbsent(bitcoinConfig.coreRpc, "auth") as any;

      if (auth.cookieFile && (auth.username || auth.password)) {
        throw new Error("specify either cookie file or username/password");
      }
    }

    this.bitcoinConfig = bitcoinConfig;
    this.ethereumConfig = ledgers.ethereum;

    const rates = tomlConfig.rates;
    this.staticRates = rates.static;
    this.testnetMarketMaker = rates.marketMaker
      ? rates.marketMaker.testnet
      : undefined;

    this.cndUrl = throwIfAbsent(tomlConfig, "cndUrl");
    this.cndListenAddress = tomlConfig.cndListenAddress;
    this.apiPort = tomlConfig.apiPort;
    this.seed = mnemonicToSeedSync(throwIfAbsent(tomlConfig, "seedWords"));
  }

  public prependUrlIfNeeded(path: string): uri.URI {
    const uriPath = new URI(path);
    return uriPath.is("relative")
      ? new URI(this.cndUrl).segment(path)
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

function throwIfAbsent<T, K extends keyof T>(obj: T, prop: K): T[K] {
  const child = obj[prop];

  if (!child) {
    logger.error(`${prop} must be present in the config file`);
    throw new Error(`${prop} must be present in the config file`);
  }

  return child;
}
