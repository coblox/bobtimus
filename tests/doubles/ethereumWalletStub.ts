import Big from "big.js";
import { TransactionReceipt } from "web3/types";
import {
  DeployContractParams,
  EthereumWallet,
  SendTransactionToParams,
  SharedTransactionParams
} from "../../src/wallets/ethereum";
import resolveOrReject from "./resolveOrReject";
import returnOrThrow from "./returnOrThrow";

interface EthereumWalletStubArgs {
  address?: string;
  deployContractReceipt?: TransactionReceipt;
  sendTransactionToReceipt?: TransactionReceipt;
  nominalBalance?: Big;
  chainId?: number;
  lastBlockTimestamp?: number;
}

export default class EthereumWalletStub implements EthereumWallet {
  public readonly address?: string;
  public readonly deployContractReceipt?: TransactionReceipt;
  public readonly sendTransactionToReceipt?: TransactionReceipt;
  public readonly nominalBalance?: Big;
  public readonly chainId?: number;
  public readonly lastBlockTimestamp?: number;

  constructor({
    address,
    deployContractReceipt,
    sendTransactionToReceipt,
    nominalBalance,
    chainId,
    lastBlockTimestamp
  }: EthereumWalletStubArgs) {
    this.address = address;
    this.deployContractReceipt = deployContractReceipt;
    this.sendTransactionToReceipt = sendTransactionToReceipt;
    this.nominalBalance = nominalBalance;
    this.chainId = chainId;
    this.lastBlockTimestamp = lastBlockTimestamp;
  }

  public deployContract(
    _: SharedTransactionParams & DeployContractParams
  ): Promise<TransactionReceipt> {
    return resolveOrReject(this, "deployContractReceipt");
  }

  public getAddress(): string {
    return returnOrThrow(this, "address");
  }

  public getBalance(): Promise<Big> {
    return resolveOrReject(this, "nominalBalance");
  }

  public sendTransactionTo(
    // @ts-ignore
    params: SharedTransactionParams & SendTransactionToParams
  ): Promise<TransactionReceipt> {
    return resolveOrReject(this, "sendTransactionToReceipt");
  }

  public getChainId(): number {
    return returnOrThrow(this, "chainId");
  }

  public getLatestBlockTimestamp(): Promise<number> {
    return resolveOrReject(this, "lastBlockTimestamp");
  }
}

export function deployContractThrows(
  _: SharedTransactionParams & DeployContractParams
): Promise<TransactionReceipt> {
  throw new Error("Mock not configured to return receipt for deploy");
}

export function getAddressThrows(): string {
  throw new Error("Mock not configured to return Ethereum address");
}

export function getBalanceThrows(): Promise<Big> {
  throw new Error("Mock not configured to return Ethereum balance");
}

export function sendTransactionToThrows(
  _: SharedTransactionParams & SendTransactionToParams
): Promise<TransactionReceipt> {
  throw new Error("Mock not configured to return receipt for send transaction");
}

export function getChainIdThrows(): number {
  throw new Error("Mock not configured to return chain id");
}

export function getLatestBlockTimestampThrows(): Promise<number> {
  throw new Error("Mock not configured to return latest block timestamp");
}
