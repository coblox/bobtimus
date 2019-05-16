/// <reference path="./bitcoin-core.d.ts" />
import Client from "bitcoin-core";
import { Transaction } from "bitcoinjs-lib";
import debug from "debug";
import { Bitcoin, BitcoinBlockchain, Satoshis, Utxo } from "./blockchain";

const log = debug("bitcoin:core_rpc");

interface RpcUtxo {
  txid: string;
  vout: number;
  scriptPubKey: string;
  amount: Bitcoin;
  height: number;
}

interface RpcTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Array<{
    txid: string;
    vout: number;
    scriptSig: {
      asm: string;
      hex: string;
    };
    sequence: number;
  }>;
  vout: Array<{
    value: Bitcoin;
    n: number; // Index
    scriptPubKey: {
      asm: string;
      hex: string;
      reqSigs: number;
      type: string;
      addresses: string[];
    };
  }>;
}

export class BitcoinCoreRpc implements BitcoinBlockchain {
  private readonly bitcoinClient: any;

  constructor(username: string, password: string, host: string, port: number) {
    this.bitcoinClient = new Client({
      protocol: "http",
      username,
      password,
      host,
      port
    });
  }

  public async broadcastTransaction(transaction: Transaction): Promise<string> {
    const hex = transaction.toHex();
    log("Broadcasting transaction ", hex);
    return this.bitcoinClient.sendRawTransaction(hex);
  }

  public async findHdOutputs(extendedPrivateKey: string): Promise<Utxo[]> {
    const scanobjects = [
      {
        desc: `combo(${extendedPrivateKey}/0'/0'/*')`,
        range: 1000
      },
      {
        desc: `combo(${extendedPrivateKey}/0'/1'/*')`,
        range: 1000
      }
    ];

    log("Starting `scantxoutset` which is a long blocking non-cached call");
    const result = await this.bitcoinClient.command(
      "scantxoutset",
      "start",
      scanobjects
    );
    if (!result || !result.success || result.unspents === undefined) {
      throw new Error(`Transaction scan failed: ${result}`);
    }
    return result.unspents.map((res: RpcUtxo) => {
      return {
        txId: res.txid,
        vout: res.vout,
        amount: Satoshis.fromBitcoin(res.amount)
      };
    });
  }

  public async getAddressAtOutpoint(
    txId: string,
    vout: number
  ): Promise<string> {
    const txHex = await this.bitcoinClient.getRawTransaction(txId);
    if (typeof txHex !== "string") {
      throw new Error(`Error retrieving transaction hex: ${txId}`);
    }
    const transaction: RpcTransaction = await this.bitcoinClient.decodeRawTransaction(
      txHex
    );
    if (typeof transaction !== "object") {
      throw new Error(`Error decoding transaction: ${txId}`);
    }

    return transaction.vout[vout].scriptPubKey.addresses[0];
  }
}
