import { bip32 } from "bitcoinjs-lib";
import BN from "bn.js";
import debug from "debug";
import EthereumTx from "ethereumjs-tx";
import utils from "ethereumjs-util";
import Web3 from "web3";
import { EthereumConfig } from "../config";

const log = debug("bobtimus:wallets:ethereum");

interface SharedTransactionParams {
  value?: BN;
  gasPrice: BN;
  gasLimit: BN;
}

interface SendTransactionToParams {
  to: string;
  data?: Buffer;
}

interface DeployContractParams {
  data: Buffer;
}

type TransactionParams = SharedTransactionParams & {
  to?: string;
  data?: Buffer;
};

export class EthereumWallet {
  /// accountIndex is the account number (hardened) that will be passed to the bitcoin Wallet
  /// ie, m/i'. Best practice to use different accounts for different blockchain in case an extended
  /// private key get leaked.

  public static fromConfig(
    ethereumConfig: EthereumConfig,
    seed: Buffer,
    accountIndex: number
  ) {
    const privateKey = bip32.fromSeed(seed).deriveHardened(accountIndex)
      .privateKey;

    if (!privateKey) {
      throw new Error(
        "Internal Error, freshly derived HD key does not have the private key."
      );
    }

    const web3 = new Web3(
      new Web3.providers.HttpProvider(ethereumConfig.web3Endpoint)
    );

    return EthereumWallet.newInstance(web3, privateKey);
  }

  public static async newInstance(web3: Web3, privateKey: Buffer) {
    const chainId = await web3.eth.net.getId();

    return new EthereumWallet(web3, privateKey, chainId);
  }

  private web3: Web3;
  private readonly privateKey: Buffer;
  private readonly account: string;
  private readonly chainId: number;

  private constructor(web3: Web3, privateKey: Buffer, chainId: number) {
    this.web3 = web3;
    this.chainId = chainId;
    this.account = "0x" + utils.privateToAddress(privateKey).toString("hex");
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

  public getAddress() {
    return this.account;
  }

  public getChainId() {
    return this.chainId;
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

    log(`Invoking web3.eth.sendSignedTransaction with ${hex}`);
    return this.web3.eth.sendSignedTransaction(hex);
  }
}
