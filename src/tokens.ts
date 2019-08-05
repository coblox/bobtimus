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

  private readonly ethereumTokens?: Map<string, Asset>;

  public constructor(tokensConfig: TokensConfig) {
    const ethereumConfig = tokensConfig.ethereum;

    if (ethereumConfig) {
      const ethereumTokens = new Map();

      Object.values(ethereumConfig).forEach((contractDecimals, index) => {
        const contract = contractDecimals.contract;
        const decimals = contractDecimals.decimals;
        const symbol = Object.keys(ethereumConfig)[index];

        if (ethereumTokens.has(contract)) {
          throw new Error(
            `Duplicate contract address detected in tokens configuration: ${contract}`
          );
        }

        ethereumTokens.set(
          contractDecimals.contract,
          new Asset(symbol, Ledger.Ethereum, contract, decimals)
        );
      });

      this.ethereumTokens = ethereumTokens;
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

    return this.ethereumTokens.get(contractAddress);
  }
}
