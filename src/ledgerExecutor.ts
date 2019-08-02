import { Result } from "@badrap/result/dist";
import { Network, Transaction } from "bitcoinjs-lib";
import BN = require("bn.js");
import { getLogger } from "log4js";
import { BitcoinFeeService } from "./bitcoin/bitcoinFeeService";
import {
  BitcoinBlockchain,
  networkFromString,
  Satoshis
} from "./bitcoin/blockchain";
import { hexToBN, hexToBuffer, LedgerAction } from "./comitNode";
import { EthereumGasPriceService } from "./ethereum/ethereumGasPriceService";
import sleep from "./sleep";
import { BitcoinWallet } from "./wallets/bitcoin";
import { EthereumWallet } from "./wallets/ethereum";

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

export interface LedgerExecutorParams {
  bitcoinBlockchain?: BitcoinBlockchain;
  bitcoinWallet?: BitcoinWallet;
  ethereumWallet?: EthereumWallet;
  bitcoinFeeService?: BitcoinFeeService;
  ethereumFeeService?: EthereumGasPriceService;
}

export class LedgerExecutor {
  private readonly bitcoinBlockchain?: BitcoinBlockchain;
  private readonly bitcoinWallet?: BitcoinWallet;
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

  public bitcoinBroadcastTransaction(
    transaction: Transaction,
    network: string
  ) {
    const bitcoinBlockchain = this.validateBitcoinWallet(
      networkFromString(network)
    ).bitcoinBlockchain;

    return bitcoinBlockchain.broadcastTransaction(transaction);
  }

  public async bitcoinGetBlockTime(network: string): Promise<number> {
    const bitcoinBlockchain = this.validateBitcoinWallet(
      networkFromString(network)
    ).bitcoinBlockchain;
    return bitcoinBlockchain.getBlockTime();
  }

  public async ethereumGetTimestamp(network: string): Promise<number> {
    const ethereumWallt = await this.validateEthereumWallet(network);

    return ethereumWallt.ethereumWallet.getLatestBlockTimestamp();
  }

  public async ethereumDeployContract(
    params: EthereumSharedTransactionParams & EthereumDeployContractParams
  ) {
    const {
      ethereumWallet,
      ethereumFeeService
    } = await this.validateEthereumWallet(params.network);

    const gasPrice = await ethereumFeeService.retrieveGasPrice();

    const parameters = { ...params, gasPrice };
    logger.info(
      `Invoking deployContract on Ethereum Wallet with ${JSON.stringify(
        parameters
      )}`
    );
    return ethereumWallet.deployContract(parameters);
  }

  public async ethereumSendTransactionTo(
    params: EthereumSharedTransactionParams & EthereumSendTransactionToParams
  ) {
    const {
      ethereumWallet,
      ethereumFeeService
    } = await this.validateEthereumWallet(params.network);

    const gasPrice = await ethereumFeeService.retrieveGasPrice();

    const parameters = {
      gasPrice,
      gasLimit: params.gasLimit,
      to: params.to,
      data: params.data ? hexToBuffer(params.data) : undefined
    };

    logger.info(
      `Invoking sendTransaction on Ethereum Wallet with ${parameters}`
    );
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
    if (!this.bitcoinBlockchain) {
      throw new Error(`Bitcoin Blockchain is not available.`);
    }

    return {
      bitcoinWallet: this.bitcoinWallet,
      bitcoinFeeService: this.bitcoinFeeService,
      bitcoinBlockchain: this.bitcoinBlockchain
    };
  }

  private async validateEthereumWallet(network: string) {
    const ethereumWallet = this.ethereumWallet;
    const ethereumFeeService = this.ethereumFeeService;

    if (!ethereumWallet) {
      throw new Error(`Ethereum Wallet is not available.`);
    }
    if (!ethereumFeeService) {
      throw new Error(`Ethereum Fee Service is not available.`);
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

    const connectedChainId = await ethereumWallet.getChainId();
    if (connectedChainId !== mappedChainId) {
      throw new Error(
        `Incompatible Ethereum network. Received: '${network}'(chainId: ${mappedChainId}), but wallet chainID is ${connectedChainId}`
      );
    }

    return {
      ethereumWallet,
      ethereumFeeService
    };
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
