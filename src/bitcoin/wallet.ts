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
interface CsUtxo {
  txId: string;
  vout: number;
  value: number; // Satoshis
  address: string;
}

interface CsTarget {
  address: string;
  value: number; // Satoshis
}

enum DerivationType {
  Internal, // For change addresses
  External // To receive payments
}

interface DerivationParameters {
  internal: DerivationType;
  id: number;
}

interface UsedAddresses {
  [address: string]: DerivationParameters;
}

export class Wallet {
  private readonly hdRoot: BIP32Interface;
  private readonly network: Network;
  private readonly blockchain: BitcoinBlockchain;
  private readonly usedAddresses: UsedAddresses;
  private unspentOutputs: Set<CsUtxo>;
  private nextDeriveId: number;

  constructor(
    xPrivateKey: string,
    blockchain: BitcoinBlockchain,
    network: Network
  ) {
    this.hdRoot = bip32.fromBase58(xPrivateKey, network);
    this.network = network;
    this.blockchain = blockchain;

    // TODO: All fields below need to be saved to a JSON file
    this.nextDeriveId = 0;
    this.usedAddresses = {};
    this.unspentOutputs = new Set<CsUtxo>();
  }

  public async getNewAddress(
    internal: DerivationType = DerivationType.External
  ) {
    const hd = this.deriveForId({ internal, id: this.nextDeriveId });
    const address = payments.p2wpkh({
      pubkey: hd.publicKey,
      network: this.network
    }).address;
    if (!address) {
      throw new Error("issue deriving address");
    }
    this.usedAddresses[address] = { internal, id: this.nextDeriveId };

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
      if (!this.unspentOutputs.has(utxo)) {
        this.unspentOutputs.add(utxo);
      }
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
        output.address = await this.getNewAddress(DerivationType.Internal);
      }
      return txb.addOutput(output.address, output.value);
    });
    await Promise.all(promises);

    const keypairs: ECPairInterface[] = [];
    const nInputs = inputs.length;

    for (let i = 0; i < nInputs; i++) {
      const input = inputs[i];
      const key = this.getPrivateKey(input.address);
      const pair = ECPair.fromPrivateKey(key, { network: this.network });
      keypairs.push(pair);

      const p2wpkh = payments.p2wpkh({
        pubkey: pair.publicKey,
        network: this.network
      });

      txb.addInput(input.txId, input.vout, undefined, p2wpkh.output);
      this.unspentOutputs.delete(input);
    }

    for (let i = 0; i < nInputs; i++) {
      txb.sign(
        i,
        keypairs[i],
        undefined,
        Transaction.SIGHASH_ALL,
        inputs[i].value
      );
    }

    const transaction = txb.build().toHex();

    return this.blockchain.broadcastTransaction(transaction);
  }

  private deriveForId({ internal, id }: DerivationParameters) {
    return this.hdRoot
      .deriveHardened(0)
      .deriveHardened(internal ? 1 : 0)
      .deriveHardened(id);
  }

  private getPrivateKey(address: string) {
    const res = this.usedAddresses[address];
    if (!res) {
      throw new Error("Cannot find id of input's address " + address);
    }
    const hd = this.deriveForId(res);
    const key = hd.privateKey;
    if (!key) {
      throw new Error(
        "Internal Error: private key of freshly derived pair is undef"
      );
    }
    return key;
  }
}
