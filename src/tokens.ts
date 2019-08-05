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
    this.ethereumTokens = tokensConfig.ethereum;
  }
}
