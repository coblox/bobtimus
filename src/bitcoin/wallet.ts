/// <reference path="./coinselect.d.ts" />
import {
  bip32,
  BIP32Interface,
  ECPair,
  Network,
  payments,
  Transaction,
  TransactionBuilder
} from "bitcoinjs-lib";
import { ECPairInterface } from "bitcoinjs-lib/types/ecpair";
import coinSelect from "coinselect";
import { BitcoinBlockchain, Utxo } from "./blockchain";

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

export class Wallet {
  public usedAddresses: Map<string, [boolean, number]>; // address, [internal, derivation id]
  public unspentOutputs: Map<CsUtxo, boolean>; // Utxo, used
  public hdRoot: BIP32Interface;
  public gapLimit: number;
  public nextDeriveId: number;
  public network: Network;
  public blockchain: BitcoinBlockchain;

  constructor(
    xPrivateKey: string,
    blockchain: BitcoinBlockchain,
    network: Network
  ) {
    this.hdRoot = bip32.fromBase58(xPrivateKey, network);
    this.gapLimit = 500;
    this.network = network;
    this.blockchain = blockchain;

    // TODO: All fields below need to be saved to a JSON file
    this.nextDeriveId = 0;
    this.usedAddresses = new Map<string, [boolean, number]>();
    this.unspentOutputs = new Map<CsUtxo, boolean>();
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
    const utxos: Utxo[] = await this.blockchain.findHdOutputs(
      this.hdRoot.toBase58()
    );

    const promises = utxos.map(async (resultUtxo: Utxo) => {
      const address = await this.blockchain.getOutputAddressFromTxId(
        resultUtxo.txId,
        resultUtxo.vout
      );

      const utxo: CsUtxo = {
        txId: resultUtxo.txId,
        vout: resultUtxo.vout,
        address,
        value: resultUtxo.satAmount
      };
      this.unspentOutputs.set(utxo, false);
    });
    await Promise.all(promises);
    const numberOfUtxos = Array.from(this.unspentOutputs.keys()).length;
    console.log(`${numberOfUtxos} UTXOs found`);
    return numberOfUtxos;
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
      Array.from(this.unspentOutputs.keys()),
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
        output.address = await this.getNewAddress(true);
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
      this.unspentOutputs.set(input, true); // Marks as used
    });

    let i = 0;
    inputs.forEach((input: CsUtxo) => {
      txb.sign(i, keypairs[i], undefined, Transaction.SIGHASH_ALL, input.value);
      i++;
    });

    const transaction = txb.build().toHex();

    return this.blockchain.broadcastTransaction(transaction);
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
