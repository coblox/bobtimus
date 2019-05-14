/// <reference path="./bitcoin-core.d.ts" />
/// <reference path="./coinselect.d.ts" />

import { Result } from "@badrap/result/dist";
import Big from "big.js";
import {
  bip32,
  BIP32Interface,
  ECPair,
  Network,
  networks,
  payments,
  Transaction,
  TransactionBuilder
} from "bitcoinjs-lib";
import { ECPairInterface } from "bitcoinjs-lib/types/ecpair";

import Client from "bitcoin-core";
import coinSelect from "coinselect";

const bitcoinClient = new Client({
  protocol: "http",
  username: "bitcoin",
  password: "54pLR_f7-G6is32LP-7nbhzZSbJs_2zSATtZV_r05yg=",
  host: "127.0.0.1",
  port: "18443"
});

function btc_to_sat(value: number): Big {
  const btc = new Big(value);
  const satsPerBtc = new Big(100000000);
  return btc.mul(satsPerBtc);
}

// Interfaces for the Blockchain
export function broadcastTransaction(
  transaction: string
): Result<string, Error> {
  console.log("Broadcasting transaction ", transaction);
  return bitcoinClient.sendRawTransaction(transaction);
}

/// Find the outputs for addresses generated with BIP32
/// Using path m/0'/0'/k' and m/0'/1'/k'
async function findHdOutputs(extendedPrivateKey: string): Promise<RpcUtxo[]> {
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

  // Warning: this is a long blocking call
  const result = await bitcoinClient.command(
    "scantxoutset",
    "start",
    scanobjects
  );
  console.log(result);
  if (
    result === undefined ||
    !result.success ||
    result.unspents === undefined
  ) {
    throw new Error(`Transaction scan failed: ${result}`);
  }
  return result.unspents;
}

async function getOutputAddressFromTxId(
  txId: string,
  vout: number
): Promise<string> {
  const txHex = await bitcoinClient.getRawTransaction(txId);
  if (typeof txHex !== "string") {
    throw new Error(`Error retrieving transaction hex: ${txId}`);
  }
  const transaction: RpcTransaction = await bitcoinClient.decodeRawTransaction(
    txHex
  );
  if (typeof transaction !== "object") {
    throw new Error(`Error decoding transaction: ${txId}`);
  }

  return transaction.vout[vout].scriptPubKey.addresses[0]; // Not sure why `addresses` is an array
}

// Interfaces for coinselect
export interface CsUtxo {
  txId: string;
  vout: number;
  value: number; // Satoshis
  address: string;
}

export interface CsTarget {
  address: string;
  value: number; // Satoshis
}

// Interfaces for bitcoin-core
export interface RpcUtxo {
  txid: string;
  vout: number;
  scriptPubKey: string;
  amount: number; // Bitcoins
  height: number;
}

export interface RpcTransaction {
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
    value: number; // Bitcoin
    n: number; // Index
    scriptPubKey: {
      asm: string;
      hex: string;
      reqSigs: number;
      type: "witness_v0_keyhash"; // Need to add the other types
      addresses: string[];
    };
  }>;
}

export class Wallet {
  public usedAddresses: Map<string, [boolean, number]>; // address, [internal, derivation id]
  public unspentOutputs: CsUtxo[];
  public hdRoot: BIP32Interface;
  public gapLimit: number;
  public nextDeriveId: number;
  public network: Network;

  constructor(xPrivateKey: string, network: Network) {
    this.hdRoot = bip32.fromBase58(xPrivateKey, network);
    // const chain = new bip32utils.Chain(hdNode);
    // this.chain = chain;
    this.gapLimit = 500;
    this.network = network;

    // TODO: All fields below need to be saved to a JSON file
    this.nextDeriveId = 0;
    this.usedAddresses = new Map<string, [boolean, number]>();
    this.unspentOutputs = [];
  }

  public async getNewAddress(internal: boolean = false) {
    const hd = this.deriveForId(internal, this.nextDeriveId);
    const address = payments.p2wpkh({
      pubkey: hd.publicKey,
      network: this.network
    }).address;
    if (!address) {
      throw new Error("issue deriving address from: " + hd);
    }
    this.usedAddresses.set(address, [internal, this.nextDeriveId]);

    this.nextDeriveId += 1;
    return address;
  }

  public async refreshUtxo() {
    const utxos: RpcUtxo[] = await findHdOutputs(this.hdRoot.toBase58());

    const promises = utxos.map(async (utxo: RpcUtxo) => {
      const sats = btc_to_sat(utxo.amount);

      const address = await getOutputAddressFromTxId(utxo.txid, utxo.vout);

      this.unspentOutputs.push({
        txId: utxo.txid,
        vout: utxo.vout,
        address,
        value: parseInt(sats.toFixed(), 10)
        // scriptPubKey: utxo.scriptPubKey,
        // redeemScript: utxo.redeemScript,
      });
    });
    await Promise.all(promises);
    console.log("Available Utxos:", this.unspentOutputs);
  }

  public async payToAddress(
    address: string,
    satAmount: string,
    feeSatPerByte: number = 55
  ) {
    const target: CsTarget = {
      address,
      value: parseInt(satAmount, 10)
    };

    const { inputs, outputs, fee } = coinSelect(
      this.unspentOutputs,
      [target],
      feeSatPerByte
    );
    console.log("Fee (sats):", fee);

    if (!inputs || !outputs) {
      throw new Error("Was not able to fund the transaction");
    }

    const txb = new TransactionBuilder(this.network);

    const promises = outputs.map(async (output: CsTarget) => {
      if (!output.address) {
        output.address = await this.getNewAddress();
      }
      return txb.addOutput(output.address, output.value);
    });
    await Promise.all(promises);

    const keypairs: ECPairInterface[] = [];
    inputs.forEach((input: CsUtxo) => {
      const key = this.getPrivateKey(input.address);
      const pair = ECPair.fromPrivateKey(key, { network: this.network });
      keypairs.push(pair);

      const p2wpkh = payments.p2wpkh({
        pubkey: pair.publicKey,
        network: this.network
      });

      txb.addInput(input.txId, input.vout, undefined, p2wpkh.output);
    });

    let i = 0;
    inputs.forEach((input: CsUtxo) => {
      txb.sign(i, keypairs[i], undefined, Transaction.SIGHASH_ALL, input.value);
      i++;
    });

    const transaction = txb.build().toHex();

    return broadcastTransaction(transaction);
  }

  private deriveForId(internal: boolean, id: number) {
    return this.hdRoot
      .deriveHardened(0)
      .deriveHardened(internal ? 1 : 0)
      .deriveHardened(id);
  }

  private getPrivateKey(address: string) {
    const res = this.usedAddresses.get(address);
    if (res === undefined) {
      throw new Error("Cannot find id of input's address " + address);
    }
    const [internal, id] = res;
    const hd = this.deriveForId(internal, id);
    const key = hd.privateKey;
    if (key === undefined) {
      throw new Error(
        "Internal Error: private key of freshly derived pair is undef"
      );
    }
    return key;
  }
}

const wallet = new Wallet(
  "tprv8ZgxMBicQKsPdSqbVeq56smMTGXHdLACXLvb5YXyk3zv4TPeTaQ6BZWeFxoVeikyfJD5vuYsKjTKaurDZDDmZGzGDMMxXzAZgAYQSrpmoUH",
  networks.regtest
);

async function main() {
  await generateIfNeeded();

  const address = await wallet.getNewAddress();
  await bitcoinClient.sendToAddress(address.toString(), 5.86);
  await bitcoinClient.generate(2);

  await wallet.refreshUtxo();
  const tx = await wallet.payToAddress(
    "bcrt1q6rhpng9evdsfnn833a4f4vej0asu6dk5srld6x",
    "10000"
  );
  console.log("tx:", tx);
}

async function generateIfNeeded() {
  const count = await bitcoinClient.getBlockCount();
  console.log("Block height:", count);
  if (count < 200) {
    await bitcoinClient.generate(200 - count);
  }
}

main();
