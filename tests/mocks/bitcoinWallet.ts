import { networks } from "bitcoinjs-lib";
import { IBitcoinWallet } from "../../src/wallets/bitcoin";

export function getBitcoinWalletThrows(): IBitcoinWallet {
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
