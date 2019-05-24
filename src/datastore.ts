import { bip32 } from "bitcoinjs-lib";
import Web3 from "web3";
import { Field } from "../gen/siren";
import { BitcoinCoreRpc } from "./bitcoin/bitcoinCoreRpc";
import { networkFromString } from "./bitcoin/blockchain";
import { BitcoinConfig, Config, EthereumConfig } from "./config";
import { BitcoinWallet } from "./wallets/bitcoin";
import { EthereumWallet } from "./wallets/ethereum";

export class Datastore {
  public ethereumWallet?: EthereumWallet;
  public bitcoinWallet?: BitcoinWallet;

  constructor(config: Config) {
    if (config.bitcoinConfig) {
      this.bitcoinWallet = initializeBitcoin(
        config.bitcoinConfig,
        config.seed,
        0
      );
    }

    if (config.ethereumConfig) {
      this.ethereumWallet = initializeEthereum(
        config.ethereumConfig,
        config.seed,
        1
      );
    }
  }

  public async getData(field: Field) {
    if (
      this.ethereumWallet &&
      field.class.includes("ethereum") &&
      field.class.includes("address")
    ) {
      return await this.ethereumWallet.getAddress();
    }

    if (
      this.bitcoinWallet &&
      field.class.includes("bitcoin") &&
      field.class.includes("address")
    ) {
      return await this.bitcoinWallet.getNewAddress();
    }
  }
}

/// accountIndex is the account number (hardened) that will be passed to the bitcoin Wallet
/// ie, m/i'. Best practice to use different accounts for different blockchain in case an extended
/// private key get leaked.

export function initializeBitcoin(
  bitcoinConfig: BitcoinConfig,
  seed: Buffer,
  accountIndex: number
) {
  const bitcoinBlockchain = BitcoinCoreRpc.fromConfig(bitcoinConfig);

  const network = networkFromString(bitcoinConfig.network);
  const hdRoot = bip32.fromSeed(seed, network).deriveHardened(accountIndex);
  return new BitcoinWallet(hdRoot, bitcoinBlockchain, network);
}

export function initializeEthereum(
  ethereumConfig: EthereumConfig,
  seed: Buffer,
  accountIndex: number
) {
  const web3 = new Web3(
    new Web3.providers.HttpProvider(ethereumConfig.web3Endpoint)
  );

  const privateKey = bip32.fromSeed(seed).deriveHardened(accountIndex)
    .privateKey;

  if (!privateKey) {
    throw new Error(
      "Internal Error, freshly derived HD key does not have the private key."
    );
  }

  return new EthereumWallet(web3, privateKey, 1);
}
