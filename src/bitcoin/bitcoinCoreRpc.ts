/// <reference path="./bitcoin-core.d.ts" />
import Client from "bitcoin-core";
import { Transaction } from "bitcoinjs-lib";
import { getLogger } from "log4js";
import { BitcoinConfig } from "../config";
import { Bitcoin, BitcoinBlockchain, Satoshis, Utxo } from "./blockchain";

const logger = getLogger();

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
  public static fromConfig(config: BitcoinConfig): BitcoinCoreRpc {
    if (config.type === "coreRpc") {
      if (
        !config.rpcUsername ||
        !config.rpcPassword ||
        !config.rpcHost ||
        !config.rpcPort
      ) {
        throw new Error(
          `rpcUsername(${
            config.rpcUsername
          }), rpcPassword(${!!config.rpcPassword}), rpcHost(${
            config.rpcHost
          }), rpcPort(${
            config.rpcPort
          }) are mandatory for coreRpc Bitcoin blockchain type`
        );
      }

      return new BitcoinCoreRpc(
        config.rpcUsername,
        config.rpcPassword,
        config.rpcHost,
        config.rpcPort
      );
    } else {
      throw new Error("Bitcoin blockchain type not supported");
    }
  }

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

  public getBlockTime(): Promise<number> {
    log("Retrieving latest block");
    const blockchaininfo = this.bitcoinClient.getblockchaininfo();
    return blockchaininfo.mediantime;
  }

  public async broadcastTransaction(transaction: Transaction): Promise<string> {
    const hex = transaction.toHex();
    logger.info("Broadcasting transaction ", hex);
    return this.bitcoinClient.sendRawTransaction(hex);
  }

  public async findHdOutputs(extendedPublicKeys: string[]): Promise<Utxo[]> {
    const scanobjects = extendedPublicKeys.map(exPubKey => {
      logger.info(`Send ${exPubKey} to bitcoind for scanning`);
      return {
        desc: `combo(${exPubKey}/*)`,
        range: 1000
      };
    });

    logger.debug(
      "Starting `scantxoutset` which is a long blocking non-cached call"
    );
    const result = await this.bitcoinClient.command(
      "scantxoutset",
      "start",
      scanobjects
    );
    if (!result || !result.success || result.unspents === undefined) {
      logger.error(`Transaction scan failed: ${result}`);
      throw new Error(`Transaction scan failed: ${result}`);
    }
    const promises = result.unspents.map(async (res: RpcUtxo) => {
      const address = await this.getAddressAtOutpoint(res.txid, res.vout);

      return {
        txId: res.txid,
        vout: res.vout,
        amount: Satoshis.fromBitcoin(res.amount),
        address
      };
    });
    return Promise.all(promises);
  }

  private async getAddressAtOutpoint(
    txId: string,
    vout: number
  ): Promise<string> {
    const txHex = await this.bitcoinClient.getRawTransaction(txId);
    if (typeof txHex !== "string") {
      logger.error(`Error retrieving transaction hex: ${txId}`);
      throw new Error(`Error retrieving transaction hex: ${txId}`);
    }
    const transaction: RpcTransaction = await this.bitcoinClient.decodeRawTransaction(
      txHex
    );
    if (typeof transaction !== "object") {
      logger.error(`Error decoding transaction: ${txId}`);
      throw new Error(`Error decoding transaction: ${txId}`);
    }

    return transaction.vout[vout].scriptPubKey.addresses[0];
  }
}
