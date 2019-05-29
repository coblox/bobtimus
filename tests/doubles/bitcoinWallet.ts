import { networks } from "bitcoinjs-lib";
import { BitcoinWallet } from "../../src/wallets/bitcoin";

export function getDummyBitcoinWallet(): BitcoinWallet {
  return {
    getNetwork() {
      return networks.regtest;
    },
    getNewAddress() {
      throw new Error("getNewAddress should not be called");
    },
    payToAddress() {
      throw new Error("payToAddress should not be called");
    }
  };
}
