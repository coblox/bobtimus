interface TokenConfigByString {
  [symbol: string]: string; // Value is the contract address
}

export interface TokensConfig {
  ethereum?: TokenConfigByString;
}

export default class Tokens {
  // @ts-ignore
  public constructor(tokensConfig: TokensConfig) {
    throw new Error("Not implemented");
  }
}
