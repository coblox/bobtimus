import Big from "big.js";
import { bip32 } from "bitcoinjs-lib";
import BN from "bn.js";
import { Transaction } from "ethereumjs-tx";
import { privateToAddress } from "ethereumjs-util";
import Web3 from "web3";
import { TransactionReceipt } from "web3/types";
import Asset from "../asset";
import { EthereumConfig } from "../config";
import Erc20ABI from "../ethereum/Erc20ABI.json";
import Ledger from "../ledger";
import { getLogger } from "../logging/logger";

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

  getBalance(asset: Asset): Promise<Big>;

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
        `Freshly derived HD key does not have the private key`,
        ethereumConfig,
        seed,
        accountIndex
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

  public async getBalance(asset: Asset) {
    if (asset.ledger !== Ledger.Ethereum) {
      return Promise.reject(
        `Only Ethereum assets are supported by the Ethereum wallet: ${asset}`
      );
    }

    if (asset === Asset.ether) {
      return this.getEtherBalance();
    } else if (asset.contract) {
      return this.getErc20Balance(asset.contract.address);
    } else {
      return Promise.reject(
        `Asset ${asset} is not supported by the Ethereum wallet`
      );
    }
  }

  private async getEtherBalance() {
    const wei = await this.web3.eth.getBalance(this.account);
    const ether = Asset.ether.toNominalUnit(new Big(wei));
    if (!ether) {
      throw new Error(`Failed to convert balance '${wei}' to a number`);
    }
    return ether;
  }

  private async getErc20Balance(contractAddress: string): Promise<Big> {
    const contract = new this.web3.eth.Contract(Erc20ABI, contractAddress);
    const address = this.getAddress();

    const balance = await contract.methods.balanceOf(address).call();
    const decimalsStr = await contract.methods.decimals().call();
    const decimals = parseInt(decimalsStr, 10);

    const result = new Big(balance).div(new Big(10).pow(decimals));
    return Promise.resolve(result);
  }

  private async paramsToTransaction({
    to,
    data,
    value = new BN(0),
    gasLimit,
    gasPrice
  }: TransactionParams) {
    const nonce = await this.web3.eth.getTransactionCount(this.account);

    return new Transaction({
      nonce: new BN(nonce).toBuffer(),
      gasPrice: gasPrice.toBuffer(),
      gasLimit: gasLimit.toBuffer(),
      to,
      data,
      value: value.toBuffer()
    });
  }

  private async signAndSend(tx: Transaction) {
    tx.sign(this.privateKey);
    const serializedTx = tx.serialize();
    const hex = "0x" + serializedTx.toString("hex");

    logger.debug(`Invoking web3.eth.sendSignedTransaction with ${hex}`);
    return this.web3.eth.sendSignedTransaction(hex);
  }
}
