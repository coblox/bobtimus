import BN from "bn.js";
import EthereumTx from "ethereumjs-tx";
import utils from "ethereumjs-util";
import Web3 from "web3";

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
  private web3: Web3;
  private chainId: number;
  private privateKey: Buffer;
  private account: string;

  constructor(web3: Web3, privateKey: Buffer, chainId: number) {
    this.chainId = chainId;
    this.web3 = web3;
    this.account = "0x" + utils.privateToAddress(privateKey).toString("hex");
    this.privateKey = privateKey;
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

    return this.web3.eth.sendSignedTransaction(hex);
  }
}
