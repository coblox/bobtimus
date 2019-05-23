import TOML from "@iarna/toml";
import Big from "big.js";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import debug from "debug";
import * as fs from "fs";
import URI from "urijs";

const log = debug("bobtimus:config");

export interface BitcoinConfig {
  type: "coreRpc";
  rpcUsername?: string;
  rpcPassword?: string;
  rpcHost?: string;
  rpcPort?: number;
  network: string;
}

export interface EthereumConfig {
  web3Endpoint: string;
}

interface Rates {
  [ticker: string]: {
    [base: string]: {
      buy: number;
      sell: number;
    };
  };
}

interface TomlConfig {
  comitNodeUrl: string;
  seedWords?: string;
  rates: Rates;
  ledgers: {
    bitcoin?: BitcoinConfig;
    ethereum?: EthereumConfig;
  };
}

export class Config {
  public static async fromFile(filePath: string) {
    const parsedConfig: any = TOML.parse(fs.readFileSync(filePath, "utf8"));
    const tomlConfig: TomlConfig = parsedConfig;

    if (!tomlConfig.seedWords) {
      log!("Generating seed words");
      const seedWords = generateMnemonic(256);
      Object.assign(tomlConfig, { seedWords });
      await backupAndWriteConfig(filePath, tomlConfig);
    }

    return new Config(tomlConfig);
  }

  public comitNodeUrl: string;
  public rates: Rates;
  public seed: Buffer;
  public bitcoinConfig?: BitcoinConfig;
  public ethereumConfig?: EthereumConfig;

  constructor(tomlConfig: TomlConfig) {
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

  public async isSupported(ledgerName: string, assetName: string) {
    switch (ledgerName + assetName) {
      case "bitcoinbitcoin":
        return !!this.bitcoinConfig;
      case "ethereumether":
        return !!this.ethereumConfig;
      default:
        return false;
    }
  }

  /// Returns Alpha divided by Beta (Beta-Alpha in exchange terms) rate based on the configuration
  public getRate(
    alphaLedger: string,
    alphaAsset: string,
    betaLedger: string,
    betaAsset: string
  ) {
    const one = new Big(1);
    const rates = this.rates;
    switch (alphaLedger + alphaAsset + betaLedger + betaAsset) {
      case "ethereumetherbitcoinbitcoin": {
        // Ether is Alpha, Bitcoin is Beta
        // Bob sells Bitcoin, buys Ether
        if (rates.bitcoin && rates.bitcoin.ether) {
          // bitcoin.ether is configured meaning
          // that the "sell" rate is when Bob "sells" bitcoin
          // the stored rate is BTC-ETH or ETH (Alpha) divided by BTC (Beta)
          return rates.bitcoin.ether.sell
            ? new Big(rates.bitcoin.ether.sell)
            : undefined;
        } else if (rates.ether && rates.ether.bitcoin) {
          // ether.bitcoin is configured meaning
          // that the "buy" rate is when Bob "buy" ether
          // the stored rate is ETH-BTC or BTC (Beta) divided by ETH (Alpha)
          // We want to return Alpha divided by Beta rate hence need to ⁻¹ it
          return rates.ether.bitcoin.buy
            ? one.div(new Big(rates.ether.bitcoin.buy))
            : undefined;
        } else {
          return undefined;
        }
      }
      case "bitcoinbitcoinethereumether": {
        // Bitcoin is Alpha, Ether is Beta
        // Bob sells Ether, buys Bitcoin
        if (rates.bitcoin && rates.bitcoin.ether) {
          // bitcoin.ether is configured meaning
          // that the "buy" rate is when Bob "buys" bitcoin
          // the stored rate is BTC-ETH or ETH (Beta) divided by BTC (Alpha)
          // We want to return Alpha divided by Beta rate hence need to ⁻¹ it
          return rates.bitcoin.ether.buy
            ? one.div(new Big(rates.bitcoin.ether.buy))
            : undefined;
        } else if (rates.ether && rates.ether.bitcoin) {
          // ether.bitcoin is configured meaning
          // that the "sell" rate is when Bob "sell" ether
          // the stored rate is ETH-BTC or BTC (Beta) divided by ETH (Alpha)
          return rates.ether.bitcoin.sell
            ? new Big(rates.ether.bitcoin.sell)
            : undefined;
        } else {
          return undefined;
        }
      }
      default: {
        log(`This combination is not yet supported`);
        return undefined;
      }
    }
  }
}

async function backupAndWriteConfig(filePath: string, config: TomlConfig) {
  const now = new Date();
  const datePostfix =
    now.getFullYear().toString() +
    now.getMonth().toString() +
    now.getDay().toString() +
    now.getHours().toString() +
    now.getSeconds().toString();
  const backupPath = filePath + ".backup." + datePostfix;
  await fs.copyFileSync(filePath, backupPath);

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
