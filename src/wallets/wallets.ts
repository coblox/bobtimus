import { BitcoinWallet } from "./bitcoin";
import { EthereumWallet } from "./ethereum";

export interface Wallets {
  bitcoinWallet?: BitcoinWallet;
  ethereumWallet?: EthereumWallet;
}
