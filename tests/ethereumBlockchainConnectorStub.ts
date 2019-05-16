import { TransactionReceipt } from "web3-core";
import { EthereumBlockchainConnector } from "../src/wallets/ethereumBlockchainConnector";

export class EthereumBlockchainConnectorStub
  implements EthereumBlockchainConnector {
  public getNonce(address: string): Promise<number> {
    return Promise.reject("stub cannot get nonce for address: " + address);
  }

  public sendSignedTransaction(hex: string): Promise<TransactionReceipt> {
    return Promise.reject("stub cannot send transaction: " + hex);
  }
}
