import { Network, Transaction } from "bitcoinjs-lib";
import BN = require("bn.js");
import { TransactionReceipt } from "web3-core/types";
import { BitcoinBlockchain, Satoshis } from "./bitcoin/blockchain";
import { hexToBuffer } from "./comitNode";
import { BitcoinWallet } from "./wallets/bitcoin";
import { EthereumWallet } from "./wallets/ethereum";
import { Wallets } from "./wallets/wallets";

export interface EthereumSharedTransactionParams {
  value?: BN;
  gasLimit: BN;
  network: string;
}

export interface EthereumSendTransactionToParams {
  to: string;
  data?: string;
}

export interface EthereumDeployContractParams {
  data: Buffer;
}

export interface Ledgers {
  bitcoinBlockchain?: BitcoinBlockchain;
}

export interface ILedgerExecutor {
  bitcoinPayToAddress: (
    address: string,
    amount: Satoshis,
    network: Network
  ) => Promise<string>;
  bitcoinBroadcastTransaction: (transaction: Transaction) => Promise<string>;
  ethereumDeployContract: (
    params: EthereumSharedTransactionParams & EthereumDeployContractParams
  ) => Promise<TransactionReceipt>;
  ethereumSendTransactionTo: (
    params: EthereumSharedTransactionParams & EthereumSendTransactionToParams
  ) => Promise<TransactionReceipt>;
}

export class LedgerExecutor implements ILedgerExecutor {
  private readonly bitcoinBlockchain?: BitcoinBlockchain;
  private readonly bitcoinWallet?: BitcoinWallet;
  private readonly ethereumWallet?: EthereumWallet;

  constructor(
    { bitcoinWallet, ethereumWallet }: Wallets,
    { bitcoinBlockchain }: Ledgers
  ) {
    this.bitcoinBlockchain = bitcoinBlockchain;
    this.bitcoinWallet = bitcoinWallet;
    this.ethereumWallet = ethereumWallet;
  }

  public bitcoinPayToAddress(
    address: string,
    amount: Satoshis,
    network: Network
  ) {
    const bitcoinWallet = this.validateBitcoinWallet(network);

    // TODO: decide strategy for Bitcoin fees
    return bitcoinWallet.payToAddress(address, amount, 150);
  }

  public bitcoinBroadcastTransaction(transaction: Transaction) {
    const bitcoinBlockchain = this.validateBitcoinBlockchain();

    return bitcoinBlockchain.broadcastTransaction(transaction);
  }

  public ethereumDeployContract(
    params: EthereumSharedTransactionParams & EthereumDeployContractParams
  ) {
    const ethereumWallet = this.validateEthereumWallet(params.network);
    // TODO: decide gas price strategy
    const parameters = Object.assign(params, { gasPrice: new BN(100) });
    return ethereumWallet.deployContract(parameters);
  }

  public ethereumSendTransactionTo(
    params: EthereumSharedTransactionParams & EthereumSendTransactionToParams
  ) {
    const ethereumWallet = this.validateEthereumWallet(params.network);
    // TODO: decide gas price strategy
    const parameters = {
      gasPrice: new BN(100),
      gasLimit: params.gasLimit,
      to: params.to
    };
    if (params.data) {
      Object.assign(params, { data: hexToBuffer(params.data) });
    }
    return ethereumWallet.sendTransactionTo(parameters);
  }

  private validateBitcoinWallet(network: Network) {
    if (!this.bitcoinWallet) {
      throw new Error(`Bitcoin Wallet is not available.`);
    }
    if (this.bitcoinWallet.network !== network) {
      throw new Error(
        `Incompatible Bitcoin network. Received: ${network}, but wallet is ${
          this.bitcoinWallet.network
        }`
      );
    }
    return this.bitcoinWallet;
  }

  private validateBitcoinBlockchain() {
    // TODO: Do we want to double check the network?
    if (!this.bitcoinBlockchain) {
      throw new Error(`Bitcoin Blockchain is not available.`);
    }
    return this.bitcoinBlockchain;
  }

  private validateEthereumWallet(network: string) {
    if (!this.ethereumWallet) {
      throw new Error(`Ethereum Wallet is not available.`);
    }
    if (this.ethereumWallet.network !== network) {
      throw new Error(
        `Incompatible Ethereum network. Received: ${network}, but wallet is ${
          this.ethereumWallet.network
        }`
      );
    }
    return this.ethereumWallet;
  }
}
