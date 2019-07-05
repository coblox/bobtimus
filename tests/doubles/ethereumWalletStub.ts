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
}

export default class EthereumWalletStub implements EthereumWallet {
  public readonly address?: string;
  public readonly deployContractReceipt?: TransactionReceipt;
  public readonly sendTransactionToReceipt?: TransactionReceipt;

  constructor({
    address,
    deployContractReceipt,
    sendTransactionToReceipt
  }: EthereumWalletStubArgs) {
    this.address = address;
    this.deployContractReceipt = deployContractReceipt;
    this.sendTransactionToReceipt = sendTransactionToReceipt;
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
    throw new Error(
      "Unexpected Call of EthereumWalletStub.getNominalBalance()"
    );
  }

  public sendTransactionTo(
    // @ts-ignore
    params: SharedTransactionParams & SendTransactionToParams
  ): Promise<TransactionReceipt> {
    return returnOrThrow(this, "sendTransactionToReceipt");
  }
}
