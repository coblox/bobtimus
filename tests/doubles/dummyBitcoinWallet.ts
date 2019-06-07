import { networks } from "bitcoinjs-lib";
import { BitcoinWallet } from "../../src/wallets/bitcoin";

export default class DummyBitcoinWallet implements BitcoinWallet {
  public getNetwork() {
    return networks.regtest;
  }

  public getNewAddress(): string {
    throw new Error("getNewAddress should not be called");
  }

  public payToAddress(): Promise<string> {
    throw new Error("payToAddress should not be called");
  }
}
