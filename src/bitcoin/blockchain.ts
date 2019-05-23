import { networks, Transaction } from "bitcoinjs-lib";
import debug from "debug";

const log = debug("bobtimus:bitcoin:blockchain");

const SATS_IN_BITCOIN = 100000000;

export interface Utxo {
  txId: string;
  vout: number;
  amount: Satoshis;
  address: string;
}

export type Bitcoin = number;

export class Satoshis {
  public static fromBitcoin = (btc: string | number): Satoshis => {
    let sats: number;
    if (typeof btc === "string") {
      sats = parseFloat(btc) * SATS_IN_BITCOIN;
    } else {
      sats = btc * SATS_IN_BITCOIN;
    }

    if (!Number.isInteger(sats)) {
      throw new Error("Only integer Satoshis are supported");
    }

    return new Satoshis(sats);
  };
  private readonly inner: number;

  constructor(sats: string | number) {
    let inner: number;
    if (typeof sats === "string") {
      inner = parseFloat(sats);
    } else {
      inner = sats;
    }

    if (!Number.isInteger(inner)) {
      log("Only whole Satoshis are supported, precision has been lost");
      inner = Math.round(inner);
    }
    this.inner = inner;
  }

  public getSatoshis() {
    return this.inner;
  }
}

export interface BitcoinBlockchain {
  broadcastTransaction(transaction: Transaction): Promise<string>;

  /// Find the outputs for addresses generated with BIP32
  /// Using path m/0'/0'/k' and m/0'/1'/k'
  findHdOutputs(extendedPublicKeys: string[]): Promise<Utxo[]>;
}

// TODO: push that to bitcoinjs-lib
export function networkFromString(network: string) {
  switch (network) {
    case "regtest":
      return networks.regtest;
    case "testnet":
      return networks.testnet;
    case "mainnet":
      return networks.bitcoin;
    default:
      throw new Error(`Unsupported bitcoin network ${network}`);
  }
}