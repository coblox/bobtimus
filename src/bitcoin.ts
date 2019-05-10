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

export function broadcastTransaction(
  transaction: string
): Result<string, Error> {
  console.log("Broadcasting transaction ", transaction);
  return bitcoinClient.sendRawTransaction(transaction);
}

// Interfaces for coinselect
export interface CsUtxo {
  txId: string;
  vout: number;
  value: number;
  address: string;
}

export interface CsTarget {
  address: string;
  value: number;
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
    // Get bitcoind to watch transaction for us
    // It's easier that or we use `scantxoutset`
    // Not sure we can do without await
    await bitcoinClient.importAddress(address);
    return address;
  }

  public async refreshUtxo() {
    // Alternatively we can use an online blockchain explorer
    const addresses = Array.from(this.usedAddresses.keys());
    const utxos = await bitcoinClient.listUnspent(1, 9999999, addresses);
    utxos.map((utxo: any) => {
      const sats = btc_to_sat(utxo.amount);

      this.unspentOutputs.push({
        address: utxo.address,
        txId: utxo.txid,
        vout: utxo.vout,
        value: parseInt(sats.toFixed(), 10)
        // scriptPubKey: utxo.scriptPubKey,
        // redeemScript: utxo.redeemScript,
      });
    });
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

main();
