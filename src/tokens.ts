import Asset from "./asset";
import Ledger from "./ledger";

interface TokenConfigByString {
  [symbol: string]: string; // Value is the contract address
}

export interface TokensConfig {
  ethereum?: TokenConfigByString;
}

export default class Tokens {
  // @ts-ignore
  private readonly ethereumTokens?: TokenConfigByString;

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
    // @ts-ignore
    ledger: Ledger,
    // @ts-ignore
    contractAddress: string
  ): Asset | undefined {
    throw new Error("not implemented");
  }
}
