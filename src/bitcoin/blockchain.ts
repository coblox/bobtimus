import { Transaction } from "bitcoinjs-lib";

const SATS_IN_BITCOIN = 100000000;

export interface Utxo {
  txId: string;
  vout: number;
  amount: Satoshis;
}

export type Bitcoin = number;

export class Satoshis {
  public static fromBitcoin = function(btc: string | number): Satoshis {
    let sats: number;
    if (typeof btc === "string") {
      sats = parseFloat(btc) * SATS_IN_BITCOIN;
    } else {
      sats = btc * SATS_IN_BITCOIN;
    }

    if (!isInt(sats)) {
      throw new Error("Only integer Satoshis are supported");
    }

    return new Satoshis(sats);
  };
  private readonly inner: number;

  constructor(sats: string | number) {
    if (typeof sats === "string") {
      this.inner = parseFloat(sats);
    } else {
      this.inner = sats;
    }

    if (!isInt(this.inner)) {
      throw new Error("Only integer Satoshis are supported");
    }
  }

  public getSatoshis() {
    return this.inner;
  }
}

export interface BitcoinBlockchain {
  broadcastTransaction(transaction: Transaction): Promise<string>;

  /// Find the outputs for addresses generated with BIP32
  /// Using path m/0'/0'/k' and m/0'/1'/k'
  findHdOutputs(extendedPrivateKey: string): Promise<Utxo[]>;

  getAddressAtOutpoint(txId: string, vout: number): Promise<string>;
}

function isInt(n: number) {
  return n % 1 === 0;
}
