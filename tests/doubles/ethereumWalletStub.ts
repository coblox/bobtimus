import Big from "big.js";
import { TransactionReceipt } from "web3-core";
import {
  DeployContractParams,
  EthereumWallet,
  SendTransactionToParams,
  SharedTransactionParams
} from "../../src/wallets/ethereum";
import returnOrThrow from "./returnOrThrow";

interface EthereumWalletStubArgs {
  address?: string;
  deployContractReceipt?: TransactionReceipt;
  sendTransactionToReceipt?: TransactionReceipt;
  nominalBalance?: number;
}

export default class EthereumWalletStub implements EthereumWallet {
  public readonly address?: string;
  public readonly deployContractReceipt?: TransactionReceipt;
  public readonly sendTransactionToReceipt?: TransactionReceipt;
  public readonly nominalBalance?: number;

  constructor({
    address,
    deployContractReceipt,
    sendTransactionToReceipt,
    nominalBalance
  }: EthereumWalletStubArgs) {
    this.address = address;
    this.deployContractReceipt = deployContractReceipt;
    this.sendTransactionToReceipt = sendTransactionToReceipt;
    this.nominalBalance = nominalBalance;
  }

  public deployContract(
    // @ts-ignore
    params: SharedTransactionParams & DeployContractParams
  ): Promise<TransactionReceipt> {
    return returnOrThrow(this, "deployContractReceipt");
  }

  public getAddress(): string {
    return returnOrThrow(this, "address");
  }

  public getNominalBalance(): Promise<Big> {
    return returnOrThrow(this, "nominalBalance");
  }

  public sendTransactionTo(
    // @ts-ignore
    params: SharedTransactionParams & SendTransactionToParams
  ): Promise<TransactionReceipt> {
    return returnOrThrow(this, "sendTransactionToReceipt");
  }
}
