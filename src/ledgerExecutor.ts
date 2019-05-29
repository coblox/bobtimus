import { Network, Transaction } from "bitcoinjs-lib";
import BN = require("bn.js");
import debug from "debug";
import { TransactionReceipt } from "web3-core/types";
import { BitcoinFeeService } from "./bitcoin/bitcoinFeeService";
import { BitcoinBlockchain, Satoshis } from "./bitcoin/blockchain";
import { hexToBuffer } from "./comitNode";
import { EthereumGasPriceService } from "./ethereum/ethereumGasPriceService";
import { IBitcoinWallet } from "./wallets/bitcoin";
import { EthereumWallet } from "./wallets/ethereum";

const log = debug("bobtimus:ledgerExecutor");

interface EthereumSharedTransactionParams {
  value?: BN;
  gasLimit: BN;
  network: string;
}

interface EthereumSendTransactionToParams {
  to: string;
  data?: string;
}

interface EthereumDeployContractParams {
  data: Buffer;
}

export interface LedgerExecutorParams {
  bitcoinBlockchain?: BitcoinBlockchain;
  bitcoinWallet?: IBitcoinWallet;
  ethereumWallet?: EthereumWallet;
  bitcoinFeeService?: BitcoinFeeService;
  ethereumFeeService?: EthereumGasPriceService;
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

// TODO: consider testing this
export class LedgerExecutor implements ILedgerExecutor {
  private readonly bitcoinBlockchain?: BitcoinBlockchain;
  private readonly bitcoinWallet?: IBitcoinWallet;
  private readonly ethereumWallet?: EthereumWallet;
  private readonly bitcoinFeeService?: BitcoinFeeService;
  private readonly ethereumFeeService?: EthereumGasPriceService;

  constructor({
    bitcoinWallet,
    ethereumWallet,
    bitcoinBlockchain,
    bitcoinFeeService,
    ethereumFeeService
  }: LedgerExecutorParams) {
    this.bitcoinBlockchain = bitcoinBlockchain;
    this.bitcoinWallet = bitcoinWallet;
    this.ethereumWallet = ethereumWallet;
    this.bitcoinFeeService = bitcoinFeeService;
    this.ethereumFeeService = ethereumFeeService;
  }

  public async bitcoinPayToAddress(
    address: string,
    amount: Satoshis,
    network: Network
  ) {
    const { bitcoinWallet, bitcoinFeeService } = this.validateBitcoinWallet(
      network
    );

    const satsPerByte: number = await bitcoinFeeService.retrieveSatsPerByte();

    return bitcoinWallet.payToAddress(
      address,
      amount,
      new Satoshis(satsPerByte)
    );
  }

  public bitcoinBroadcastTransaction(transaction: Transaction) {
    const bitcoinBlockchain = this.validateBitcoinBlockchain();

    return bitcoinBlockchain.broadcastTransaction(transaction);
  }

  public async ethereumDeployContract(
    params: EthereumSharedTransactionParams & EthereumDeployContractParams
  ) {
    const { ethereumWallet, ethereumFeeService } = this.validateEthereumWallet(
      params.network
    );

    const gasPrice = await ethereumFeeService.retrieveGasPrice();

    const parameters = { ...params, gasPrice };
    log(
      `Invoking deployContract on Ethereum Wallet with ${JSON.stringify(
        parameters
      )}`
    );
    return ethereumWallet.deployContract(parameters);
  }

  public async ethereumSendTransactionTo(
    params: EthereumSharedTransactionParams & EthereumSendTransactionToParams
  ) {
    const { ethereumWallet, ethereumFeeService } = this.validateEthereumWallet(
      params.network
    );

    const gasPrice = await ethereumFeeService.retrieveGasPrice();

    const parameters = {
      gasPrice,
      gasLimit: params.gasLimit,
      to: params.to
    };
    if (params.data) {
      Object.assign(params, { data: hexToBuffer(params.data) });
    }
    log(`Invoking sendTransaction on Ethereum Wallet with ${parameters}`);
    return ethereumWallet.sendTransactionTo(parameters);
  }

  private validateBitcoinWallet(network: Network) {
    if (!this.bitcoinWallet) {
      throw new Error(`Bitcoin Wallet is not available.`);
    }
    if (!this.bitcoinFeeService) {
      throw new Error(`Bitcoin Fee Service is not available.`);
    }
    if (this.bitcoinWallet.getNetwork() !== network) {
      throw new Error(
        `Incompatible Bitcoin network. Received: ${network}, but wallet is ${this.bitcoinWallet.getNetwork()}`
      );
    }
    return {
      bitcoinWallet: this.bitcoinWallet,
      bitcoinFeeService: this.bitcoinFeeService
    };
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
    if (!this.ethereumFeeService) {
      throw new Error(`Ethereum Fee Service is not available.`);
    }
    if (this.ethereumWallet.network !== network) {
      throw new Error(
        `Incompatible Ethereum network. Received: ${network}, but wallet is ${
          this.ethereumWallet.network
        }`
      );
    }
    return {
      ethereumWallet: this.ethereumWallet,
      ethereumFeeService: this.ethereumFeeService
    };
  }
}
