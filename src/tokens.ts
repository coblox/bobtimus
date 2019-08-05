import TOML from "@iarna/toml";
import * as fs from "fs";
import { getLogger } from "log4js";
import Asset from "./asset";
import Ledger from "./ledger";

const logger = getLogger();

interface TokenConfig {
  [symbol: string]: {
    contract: string;
    decimals: number;
  };
}

export interface TokensConfig {
  ethereum?: TokenConfig;
}

export default class Tokens {
  public static fromFile(tomlFilePath: string): Tokens {
    const tokensConfig: TokensConfig = TOML.parse(
      fs.readFileSync(tomlFilePath, "utf8")
    );
    return new Tokens(tokensConfig);
  }

  private readonly ethereumTokens?: TokenConfig;

  public constructor(tokensConfig: TokensConfig) {
    const ethereumConfig = tokensConfig.ethereum;
    if (ethereumConfig) {
      Object.values(ethereumConfig).forEach((address, index) => {
        const lastIndex = Object.values(ethereumConfig).lastIndexOf(address);
        if (lastIndex !== index) {
          throw new Error(
            `Duplicate contract address detected in tokens configuration: ${address}`
          );
        }
      });
      this.ethereumTokens = tokensConfig.ethereum;
    }
  }

  public createAsset(
    ledger: Ledger,
    contractAddress: string
  ): Asset | undefined {
    if (ledger !== Ledger.Ethereum) {
      logger.warn("Tokens are only implemented for Ethereum Ledger");
      return undefined;
    }

    if (!this.ethereumTokens) {
      logger.warn("No Ethereum Tokens configured.");
      return undefined;
    }

    const ethereumTokens = this.ethereumTokens;
    let asset;
    Object.values(ethereumTokens).forEach((contractDecimals, index) => {
      if (contractDecimals.contract === contractAddress) {
        const symbol = Object.keys(ethereumTokens)[index];
        asset = new Asset(symbol, ledger, contractAddress);
        return;
      }
    });

    if (!asset) {
      logger.warn(`Token with address ${contractAddress} is not configured`);
    }
    return asset;
  }
}
