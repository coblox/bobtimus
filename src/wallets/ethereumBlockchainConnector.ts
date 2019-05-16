import { TransactionReceipt } from "web3-core";

export interface EthereumBlockchainConnector {
  getNonce(address: string): Promise<number>;
  sendSignedTransaction(hex: string): Promise<TransactionReceipt>;
}
