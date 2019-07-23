import Big from "big.js";
import { bip32 } from "bitcoinjs-lib";
import BN from "bn.js";
import EthereumTx from "ethereumjs-tx";
import { privateToAddress } from "ethereumjs-util";
import { getLogger } from "log4js";
import Web3 from "web3";
import { TransactionReceipt } from "web3-core";
import Asset, { toNominalUnit } from "../asset";
import { EthereumConfig } from "../config";

const logger = getLogger();

export interface SharedTransactionParams {
  value?: BN;
  gasPrice: BN;
  gasLimit: BN;
}

export interface SendTransactionToParams {
  to: string;
  data?: Buffer;
}

export interface DeployContractParams {
  data: Buffer;
}

export type TransactionParams = SharedTransactionParams & {
  to?: string;
  data?: Buffer;
};

export interface EthereumWallet {
  sendTransactionTo(
    params: SharedTransactionParams & SendTransactionToParams
  ): Promise<TransactionReceipt>;

  deployContract(
    params: SharedTransactionParams & DeployContractParams
  ): Promise<TransactionReceipt>;

  getAddress(): string;

  getChainId(): number;

  getNominalBalance(): Promise<Big>;

  getLatestBlockTimestamp(): Promise<number>;
}

export class Web3EthereumWallet implements EthereumWallet {
  /// accountIndex is the account number (hardened) that will be passed to the bitcoin Wallet
  /// ie, m/i'. Best practice to use different accounts for different blockchain in case an extended
  /// private key gets leaked.

  public static fromConfig(
    ethereumConfig: EthereumConfig,
    seed: Buffer,
    accountIndex: number
  ) {
    const privateKey = bip32.fromSeed(seed).deriveHardened(accountIndex)
      .privateKey;

    if (!privateKey) {
      logger.error(
        `Freshly derived HD key does not have the private key, parameters 
        [ethereumConfig: ${ethereumConfig}, seed: ${seed}, accountIndex: ${accountIndex}]`
      );
      throw new Error(
        "Internal Error, freshly derived HD key does not have the private key"
      );
    }

    const web3 = new Web3(
      new Web3.providers.HttpProvider(ethereumConfig.web3Endpoint)
    );

    return Web3EthereumWallet.newInstance(web3, privateKey);
  }

  public static async newInstance(web3: Web3, privateKey: Buffer) {
    const chainId = await web3.eth.net.getId();

    return new Web3EthereumWallet(web3, privateKey, chainId) as EthereumWallet;
  }

  private web3: Web3;
  private readonly privateKey: Buffer;
  private readonly account: string;
  private readonly chainId: number;

  private constructor(web3: Web3, privateKey: Buffer, chainId: number) {
    this.web3 = web3;
    this.chainId = chainId;
    this.account = "0x" + privateToAddress(privateKey).toString("hex");
    this.privateKey = privateKey;

    // Why? Because: https://github.com/ethereum/web3.js/issues/2822
    this.web3.eth.transactionConfirmationBlocks = 1;
  }

  public async sendTransactionTo(
    params: SharedTransactionParams & SendTransactionToParams
  ) {
    const tx = await this.paramsToTransaction(params);

    return this.signAndSend(tx);
  }

  public async deployContract(
    params: SharedTransactionParams & DeployContractParams
  ) {
    const tx = await this.paramsToTransaction(params);

    return this.signAndSend(tx);
  }

  public async getLatestBlockTimestamp() {
    logger.info("Retrieving latest block");
    const latest = await this.web3.eth.getBlockNumber();
    const block = await this.web3.eth.getBlock(latest);

    return +block.timestamp;
  }

  public getAddress() {
    return this.account;
  }

  public getChainId() {
    return this.chainId;
  }

  public async getNominalBalance() {
    const wei = await this.web3.eth.getBalance(this.account);
    const ether = toNominalUnit(Asset.Ether, new Big(wei));
    if (!ether) {
      throw new Error(`Failed to convert balance '${wei}' to a number`);
    }
    return ether;
  }

  private async paramsToTransaction({
    to,
    data,
    value = new BN(0),
    gasLimit,
    gasPrice
  }: TransactionParams) {
    const nonce = await this.web3.eth.getTransactionCount(this.account);

    return new EthereumTx({
      nonce: new BN(nonce).toBuffer(),
      gasPrice: gasPrice.toBuffer(),
      gasLimit: gasLimit.toBuffer(),
      to,
      data,
      value: value.toBuffer(),
      chainId: this.chainId
    });
  }

  private async signAndSend(tx: EthereumTx) {
    tx.sign(this.privateKey);
    const serializedTx = tx.serialize();
    const hex = "0x" + serializedTx.toString("hex");

    logger.debug(`Invoking web3.eth.sendSignedTransaction with ${hex}`);
    return this.web3.eth.sendSignedTransaction(hex);
  }
}
