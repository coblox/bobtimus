import TOML, { JsonMap } from "@iarna/toml";
import Big from "big.js";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import debug from "debug";
import * as fs from "fs";
import URI from "urijs";

const info = debug("bobtimus:info:config");

interface SellBitcoinSwapConfig extends JsonMap {
  buyEther: {
    bitcoin: string;
    ether: string;
  };
}

interface SellEtherSwapConfig extends JsonMap {
  buyBitcoin: {
    bitcoin: string;
    ether: string;
  };
}

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

interface TomlConfig {
  comitNodeUrl: string;
  seedWords?: string;
  sellBitcoin?: SellBitcoinSwapConfig;
  sellEther?: SellEtherSwapConfig;
  bitcoin?: BitcoinConfig;
  ethereum?: EthereumConfig;
}

interface Rates {
  sellBitcoin?: SellBitcoinSwapConfig;
  sellEther?: SellEtherSwapConfig;
}

export class Config {
  public comitNodeUrl: string;
  public rates: Rates;
  public seed: Buffer;
  public bitcoinConfig?: BitcoinConfig;
  public ethereumConfig?: EthereumConfig;

  constructor(filePath: string) {
    const parsedConfig: any = TOML.parse(fs.readFileSync(filePath, "utf8"));
    const config: TomlConfig = parsedConfig;
    this.rates = {};
    this.rates.sellBitcoin = config.sellBitcoin;
    this.rates.sellEther = config.sellEther;

    this.bitcoinConfig = config.bitcoin;
    this.ethereumConfig = config.ethereum;

    if (!config.comitNodeUrl) {
      throw new Error("comitNodeUrl must be present in the config file");
    } else {
      this.comitNodeUrl = config.comitNodeUrl;
    }

    if (config.seedWords) {
      this.seed = mnemonicToSeedSync(config.seedWords);
    } else {
      info!("Generating seed words");
      const seedWords = generateMnemonic(256);
      this.seed = mnemonicToSeedSync(seedWords);

      const tomlConfig = config;
      Object.assign(tomlConfig, { seedWords });
      backupAndWriteConfig(filePath, tomlConfig);
    }
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

  public getRate(
    alphaLedger: string,
    alphaAsset: string,
    betaLedger: string,
    betaAsset: string
  ) {
    const rates = this.rates;
    let alphaQuantityThreshold: Big;
    let betaQuantityThreshold: Big;
    switch (alphaLedger + alphaAsset + betaLedger + betaAsset) {
      case "ethereumetherbitcoinbitcoin": {
        // Ether is Alpha, Bitcoin is Beta
        // Bob sells Bitcoin, buys Ether
        if (!rates.sellBitcoin || !rates.sellBitcoin.buyEther) {
          info("sellBitcoin.buyEther is not configured, cannot return a rate");
          return undefined;
        }
        alphaQuantityThreshold = new Big(rates.sellBitcoin.buyEther.ether);
        betaQuantityThreshold = new Big(rates.sellBitcoin.buyEther.bitcoin);
        break;
      }
      case "bitcoinbitcoinethereumether": {
        // Bitcoin is Alpha, Ether is Beta
        // Bob sells Ether, buys Bitcoin
        if (!rates.sellEther || !rates.sellEther.buyBitcoin) {
          info("sellEther.buyBitcoin is not configured, cannot return a rate");
          return undefined;
        }
        alphaQuantityThreshold = new Big(rates.sellEther.buyBitcoin.bitcoin);
        betaQuantityThreshold = new Big(rates.sellEther.buyBitcoin.ether);
        break;
      }
      default: {
        info(`This combination is not yet supported`);
        return undefined;
      }
    }

    return alphaQuantityThreshold.div(betaQuantityThreshold);
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
  fs.copyFile(filePath, backupPath, err => {
    if (err) {
      throw err;
    }

    const jsonMap: any = config;
    const toml = TOML.stringify(jsonMap);

    fs.writeFile(filePath, toml, err => {
      if (err) {
        throw err;
      }
      info("Config file was generated and saved");
    });
  });
}
