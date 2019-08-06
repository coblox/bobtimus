/// <reference path="../bitcoin/coinselect.d.ts" />
import Big from "big.js";
import {
  bip32,
  BIP32Interface,
  ECPair,
  Network,
  payments,
  Psbt
} from "bitcoinjs-lib";
import { ECPairInterface } from "bitcoinjs-lib/types/ecpair";
import coinSelect from "coinselect";
import Asset, { toNominalUnit } from "../asset";
import {
  BitcoinBlockchain,
  networkFromString,
  Satoshis,
  Utxo
} from "../bitcoin/blockchain";
import { BitcoinConfig } from "../config";
import { getLogger } from "../logging/logger";

const logger = getLogger();

// Interfaces for coinselect
interface CsUtxo {
  txId: string;
  vout: number;
  value: number; // Satoshis
  address: string;
}

function toKey(utxo: CsUtxo) {
  return (
    utxo.txId + utxo.vout.toString() + utxo.value.toString() + utxo.address
  );
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
  type: DerivationType;
  id: number;
}

interface UsedAddresses {
  [address: string]: DerivationParameters;
}

export interface BitcoinWallet {
  getNewAddress(): string;
  payToAddress(
    address: string,
    amount: Satoshis,
    feeSatPerByte: Satoshis
  ): Promise<string>;
  getNetwork(): Network;
  getNominalBalance(): Big;
}

export class InternalBitcoinWallet implements BitcoinWallet {
  /// accountIndex is the account number (hardened) that will be passed to the bitcoin Wallet
  /// ie, m/i'. Best practice to use different accounts for different blockchain in case an extended
  /// private key gets leaked.
  public static fromConfig(
    bitcoinConfig: BitcoinConfig,
    bitcoinBlockchain: BitcoinBlockchain,
    seed: Buffer,
    accountIndex: number
  ) {
    const network = networkFromString(bitcoinConfig.network);
    const hdRoot = bip32.fromSeed(seed, network).deriveHardened(accountIndex);
    return new InternalBitcoinWallet(hdRoot, bitcoinBlockchain, network);
  }
  private readonly network: Network;
  private readonly blockchain: BitcoinBlockchain;
  private readonly hdRoot: BIP32Interface;
  private readonly usedAddresses: UsedAddresses;
  private readonly unspentOutputs: Map<string, CsUtxo>;
  private nextDeriveId: number;

  constructor(
    hdRoot: BIP32Interface,
    blockchain: BitcoinBlockchain,
    network: Network
  ) {
    this.hdRoot = hdRoot;
    this.network = network;
    this.blockchain = blockchain;

    // TODO: All fields below need to be saved to a JSON file. See #13
    this.nextDeriveId = 0;
    this.usedAddresses = {};
    this.unspentOutputs = new Map();
  }

  public getNewAddress(
    derivationType: DerivationType = DerivationType.External
  ) {
    const hd = this.deriveForId({
      type: derivationType,
      id: this.nextDeriveId
    });
    const address = payments.p2wpkh({
      pubkey: hd.publicKey,
      network: this.network
    }).address;
    if (!address) {
      logger.crit(
        `Address could not be derived for derivationType ${derivationType}.`
      );
      throw new Error("issue deriving address");
    }
    this.usedAddresses[address] = {
      type: derivationType,
      id: this.nextDeriveId
    };

    this.nextDeriveId += 1;
    return address;
  }

  public getNetwork(): Network {
    return this.network;
  }

  public getNominalBalance(): Big {
    const satBalance = Array.from(this.unspentOutputs.values()).reduce(
      (sum, next) => sum.add(next.value),
      new Big(0)
    );

    const bitcoinBalance = toNominalUnit(Asset.bitcoin, satBalance);
    if (!bitcoinBalance) {
      throw new Error("Internal Error: Bitcoin is not supported?");
    }

    return bitcoinBalance;
  }

  public async refreshUtxo() {
    // `.neutered()` removes the private key, meaning that we passed the extended
    // public key in base58 to Bitcoin Core RPC
    const utxos: Utxo[] = await this.blockchain.findHdOutputs([
      this.deriveParentKeyToAddresses(DerivationType.Internal)
        .neutered()
        .toBase58(),
      this.deriveParentKeyToAddresses(DerivationType.External)
        .neutered()
        .toBase58()
    ]);

    const promises = utxos.map(async (resultUtxo: Utxo) => {
      const utxo: CsUtxo = {
        txId: resultUtxo.txId,
        vout: resultUtxo.vout,
        address: resultUtxo.address,
        value: resultUtxo.amount.getSatoshis()
      };
      if (!this.unspentOutputs.has(toKey(utxo))) {
        this.unspentOutputs.set(toKey(utxo), utxo);
      }
    });
    await Promise.all(promises);
    const numberOfUtxos = this.unspentOutputs.size;
    logger.debug(`${numberOfUtxos} UTXOs found`);
    return numberOfUtxos;
  }

  public async payToAddress(
    address: string,
    amount: Satoshis,
    feeSatPerByte: Satoshis
  ) {
    const target: CsTarget = {
      address,
      value: amount.getSatoshis()
    };

    const { inputs, outputs, fee } = coinSelect(
      Array.from(this.unspentOutputs.values()),
      [target],
      feeSatPerByte.getSatoshis()
    );
    logger.debug("Fee (sats):", fee);

    if (!inputs || !outputs) {
      logger.crit(
        `Was not able to fund the transaction [address: ${address}, amountSat ${amount}, feeSatPerByte ${feeSatPerByte}]`
      );
      throw new Error("Was not able to fund the transaction");
    }

    const psbt = new Psbt({ network: this.network });

    for (const output of outputs) {
      if (!output.address) {
        output.address = this.getNewAddress(DerivationType.Internal);
      }
      psbt.addOutput(output);
    }

    const nInputs = inputs.length;
    const keypairs: ECPairInterface[] = new Array(nInputs);

    for (let i = 0; i < nInputs; i++) {
      const input: CsUtxo = inputs[i];
      const key = this.getPrivateKey(input.address);
      const pair = ECPair.fromPrivateKey(key, { network: this.network });
      keypairs[i] = pair;

      const p2wpkh = payments.p2wpkh({
        pubkey: pair.publicKey,
        network: this.network
      });

      psbt.addInput({
        hash: input.txId,
        index: input.vout,
        // @ts-ignore: @types/bitcoinjs-lib is not aligned with latest bitcoinjs-lib
        witnessUtxo: {
          script: p2wpkh.output,
          value: input.value
        }
      });
      this.unspentOutputs.delete(toKey(input));
    }

    for (let i = 0; i < nInputs; i++) {
      psbt.signInput(i, keypairs[i]);
    }

    const transaction = psbt.finalizeAllInputs().extractTransaction();

    return this.blockchain.broadcastTransaction(transaction);
  }

  private deriveForId({ type, id }: DerivationParameters) {
    return this.deriveParentKeyToAddresses(type).derive(id);
  }

  /// An "account key" k (ie, m/n' with m the master key) should be
  /// passed to the bitcoin wallet. Then 2 keys are derived:
  /// k/0' (= m/n'/0') for external addresses, iᵗʰ external address is k/0'/i (= m/n'/0'/i)
  /// k/1' (= m/n'/1') for internal addresses iᵗʰ internal address is k/1'/i (= m/n'/1'/i)
  /// This returns the key that is then used to directly derive the addresses, ie k/0' or k/1'
  private deriveParentKeyToAddresses(derivationType: DerivationType) {
    return this.hdRoot.deriveHardened(
      derivationType === DerivationType.Internal ? 1 : 0
    );
  }

  private getPrivateKey(address: string) {
    const res = this.usedAddresses[address];
    if (!res) {
      logger.crit(`Cannot find address ${address}`);
      throw new Error(`Cannot find id of input's address ${address}`);
    }
    const hd = this.deriveForId(res);
    const key = hd.privateKey;
    if (!key) {
      logger.crit(
        `Private key of freshly derived pair for address ${address} is undefined`
      );
      throw new Error(
        "Internal Error: private key of freshly derived pair is undef"
      );
    }
    return key;
  }
}
