import BN from "bn.js";
import EthereumTx from "ethereumjs-tx";
import utils from "ethereumjs-util";
import Web3 from "web3";
import { EthereumBlockchainConnector } from "./ethereumBlockchainConnector";

interface TransactionParams {
  to?: string;
  data?: Buffer;
  value?: BN;
  gasPrice: BN;
  gasLimit: BN;
}

export class Web3EthereumBlockchainConnector
  implements EthereumBlockchainConnector {
  private web3: Web3;

  constructor(web3: Web3) {
    this.web3 = web3;
  }

  public getNonce(address: string) {
    return this.web3.eth.getTransactionCount(address);
  }

  public sendSignedTransaction(hex: string) {
    return this.web3.eth.sendSignedTransaction(hex);
  }
}

export class EthereumWallet {
  private ethereum: EthereumBlockchainConnector;
  private chainId: number;
  private privateKey: Buffer;
  private account: string;

  constructor(
    ethereum: EthereumBlockchainConnector,
    privateKey: Buffer,
    chainId: number
  ) {
    this.chainId = chainId;
    this.ethereum = ethereum;
    this.account = "0x" + utils.privateToAddress(privateKey).toString("hex");
    this.privateKey = privateKey;
  }

  public async sendTransactionTo(params: TransactionParams) {
    if (!params.to && !params.data) {
      throw new Error("A transaction without `to` and `data` is not valid.");
    }

    const tx = await this.paramsToTransaction(params);

    return this.signAndSend(tx);
  }

  public async deployContract(params: TransactionParams) {
    if (params.to) {
      throw new Error("Contract deployments must not set a `to` address.");
    }

    if (!params.data) {
      throw new Error("Contract deployments must have `data`.");
    }

    const tx = await this.paramsToTransaction(params);

    return this.signAndSend(tx);
  }

  private async paramsToTransaction({
    to,
    data,
    value = new BN(0),
    gasLimit,
    gasPrice
  }: TransactionParams) {
    const nonce = await this.ethereum.getNonce(this.account);

    return new EthereumTx({
      nonce: `0x${new BN(nonce).toString("hex")}`,
      gasPrice: `0x${gasPrice.toString("hex")}`,
      gasLimit: `0x${gasLimit.toString("hex")}`,
      to: to ? to : null,
      data: data ? data : null,
      value: `0x${value.toString("hex")}`,
      chainId: this.chainId
    });
  }

  private async signAndSend(tx: EthereumTx) {
    tx.sign(this.privateKey);
    const serializedTx = tx.serialize();
    const hex = "0x" + serializedTx.toString("hex");

    return this.ethereum.sendSignedTransaction(hex);
  }
}
