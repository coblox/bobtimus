import { Result } from "@badrap/result/dist";
import { Network, Transaction } from "bitcoinjs-lib";
import BN = require("bn.js");
import { getLogger } from "log4js";
import { TransactionReceipt } from "web3/types";
import { networkFromString, Satoshis } from "./bitcoin/blockchain";
import { hexToBN, hexToBuffer, LedgerAction } from "./comitNode";
import sleep from "./sleep";
import {
  DeployContractParams,
  SendTransactionToParams,
  SharedTransactionParams
} from "./wallets/ethereum";

const logger = getLogger();

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

export interface EthereumLedgerExecutorParams {
  getWalletChainId: () => number;
  getLatestBlockTimestamp: () => Promise<number>;
  deployContract: (
    params: SharedTransactionParams & DeployContractParams
  ) => Promise<TransactionReceipt>;
  retrieveGasPrice: (strategyName?: string) => Promise<BN>;
  sendTransactionTo: (
    params: SharedTransactionParams & SendTransactionToParams
  ) => Promise<TransactionReceipt>;
}

export interface BitcoinLedgerExecutorParams {
  getBlockTime: () => Promise<number>;
  getWalletNetwork: () => Network;
  broadcastTransaction: (transaction: Transaction) => Promise<string>;
  retrieveSatsPerByte: (strategyName?: string) => Promise<number>;
  payToAddress: (
    address: string,
    amount: Satoshis,
    feeSatPerByte: Satoshis
  ) => Promise<string>;
}

export class LedgerExecutor {
  private readonly bitcoin?: BitcoinLedgerExecutorParams;
  private readonly ethereum?: EthereumLedgerExecutorParams;

  constructor(
    bitcoinParams?: BitcoinLedgerExecutorParams,
    ethereumParams?: EthereumLedgerExecutorParams
  ) {
    this.bitcoin = bitcoinParams;
    this.ethereum = ethereumParams;
  }

  public async execute(action: LedgerAction) {
    logger.trace(`Execute Ledger Action: ${JSON.stringify(action)}`);
    try {
      const network = action.payload.network;
      switch (action.type) {
        case "bitcoin-send-amount-to-address": {
          const satoshis = new Satoshis(action.payload.amount);
          const result = await this.bitcoinPayToAddress(
            action.payload.to,
            satoshis,
            networkFromString(action.payload.network)
          );
          return Result.ok(result);
        }
        case "bitcoin-broadcast-signed-transaction": {
          const minMedianBlockTime = action.payload.min_median_block_time;
          if (minMedianBlockTime) {
            await sleepTillBlockchainTimeReached(minMedianBlockTime, () =>
              this.bitcoinGetBlockTime(network)
            );
          }

          const transaction = Transaction.fromHex(action.payload.hex);
          const result = await this.bitcoinBroadcastTransaction(
            transaction,
            network
          );
          return Result.ok(result);
        }
        case "ethereum-deploy-contract": {
          const params = {
            value: new BN(action.payload.amount),
            gasLimit: hexToBN(action.payload.gas_limit),
            data: hexToBuffer(action.payload.data),
            network: action.payload.network
          };
          const result = await this.ethereumDeployContract(params);
          return Result.ok(result);
        }
        case "ethereum-call-contract": {
          const minBlockTimestamp = action.payload.min_block_timestamp;
          if (minBlockTimestamp) {
            await sleepTillBlockchainTimeReached(minBlockTimestamp, () =>
              this.ethereumGetTimestamp(network)
            );
          }

          const params = {
            gasLimit: hexToBN(action.payload.gas_limit),
            to: action.payload.contract_address,
            network: action.payload.network,
            data: action.payload.data
          };
          const result = await this.ethereumSendTransactionTo(params);
          return Result.ok(result);
        }
        default: {
          return Result.err(
            new Error(`Action type ${action} is not supported`)
          );
        }
      }
    } catch (err) {
      return Result.err(err);
    }
  }

  public async bitcoinPayToAddress(
    address: string,
    amount: Satoshis,
    network: Network
  ) {
    const { payToAddress, retrieveSatsPerByte } = this.validateBitcoinWallet(
      network
    );

    const satsPerByte: number = await retrieveSatsPerByte();

    return payToAddress(address, amount, new Satoshis(satsPerByte));
  }

  public bitcoinBroadcastTransaction(
    transaction: Transaction,
    network: string
  ) {
    const broadcastTransaction = this.validateBitcoinWallet(
      networkFromString(network)
    ).broadcastTransaction;

    return broadcastTransaction(transaction);
  }

  public async bitcoinGetBlockTime(network: string): Promise<number> {
    const { getBlockTime } = this.validateBitcoinWallet(
      networkFromString(network)
    );
    return getBlockTime();
  }

  public async ethereumGetTimestamp(network: string): Promise<number> {
    const { getLatestBlockTimestamp } = await this.validateEthereumWallet(
      network
    );

    return getLatestBlockTimestamp();
  }

  public async ethereumDeployContract(
    params: EthereumSharedTransactionParams & EthereumDeployContractParams
  ) {
    const {
      retrieveGasPrice,
      deployContract
    } = await this.validateEthereumWallet(params.network);

    const gasPrice = await retrieveGasPrice();

    const parameters = { ...params, gasPrice };
    logger.info(
      `Invoking deployContract on Ethereum Wallet with ${JSON.stringify(
        parameters
      )}`
    );
    return deployContract(parameters);
  }

  public async ethereumSendTransactionTo(
    params: EthereumSharedTransactionParams & EthereumSendTransactionToParams
  ) {
    const {
      retrieveGasPrice,
      sendTransactionTo
    } = await this.validateEthereumWallet(params.network);

    const gasPrice = await retrieveGasPrice();

    const parameters = {
      gasPrice,
      gasLimit: params.gasLimit,
      to: params.to,
      data: params.data ? hexToBuffer(params.data) : undefined
    };

    logger.info(
      `Invoking sendTransaction on Ethereum Wallet with ${parameters}`
    );
    return sendTransactionTo(parameters);
  }

  private validateBitcoinWallet(network: Network) {
    if (!this.bitcoin) {
      throw new Error(`Bitcoin is not available.`);
    }

    if (this.bitcoin.getWalletNetwork() !== network) {
      throw new Error(
        `Incompatible Bitcoin network. Received: ${network}, but wallet is ${this.bitcoin.getWalletNetwork()}`
      );
    }
    return this.bitcoin;
  }

  private async validateEthereumWallet(network: string) {
    const ethereum = this.ethereum;

    if (!ethereum) {
      throw new Error(`Ethereum is not available.`);
    }

    // To fix this awkward comparison, make the comit_node use chainId for Ethereum: https://github.com/comit-network/RFCs/issues/73
    const ethereumNetworkMappings: { [network: string]: number | undefined } = {
      regtest: 17,
      ropsten: 3
    };

    const mappedChainId = ethereumNetworkMappings[network];

    if (!mappedChainId) {
      throw new Error(
        `Unsupported network. Bobtimus does not support Ethereum network '${network}' because no mapping to the chainId has been defined`
      );
    }

    const connectedChainId = await ethereum.getWalletChainId();
    if (connectedChainId !== mappedChainId) {
      throw new Error(
        `Incompatible Ethereum network. Received: '${network}'(chainId: ${mappedChainId}), but wallet chainID is ${connectedChainId}`
      );
    }

    return ethereum;
  }
}

async function sleepTillBlockchainTimeReached(
  targetTime: number,
  getCurrentBlockTime: () => Promise<number>
) {
  let currentBlockTime = await getCurrentBlockTime();
  let diff = targetTime - currentBlockTime;

  if (diff > 0) {
    logger.info(
      `Initializing refund, waiting for block time to pass ${targetTime}`
    );

    while (diff > 0) {
      await sleep(1000);

      currentBlockTime = await getCurrentBlockTime();
      diff = targetTime - currentBlockTime;
    }
  }

  logger.info(`Block time has passed ${targetTime}, executing refund`);
}
