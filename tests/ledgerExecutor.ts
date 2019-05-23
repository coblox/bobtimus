import { TransactionReceipt } from "web3-core/types";
import { ILedgerExecutor } from "../src/ledgerExecutor";

export function getLedgerExecutorThrowsOnAll(): ILedgerExecutor {
  return {
    bitcoinBroadcastTransaction: () => {
      throw new Error(`bitcoinBroadcastTransaction should not be called`);
    },
    bitcoinPayToAddress: () => {
      throw new Error(`bitcoinPayToAddress should not be called`);
    },
    ethereumDeployContract: () => {
      throw new Error(`ethereumDeployContract should not be called`);
    },
    ethereumSendTransactionTo: () => {
      throw new Error(`ethereumSendTransactionTo should not be called`);
    }
  };
}

export const emptyTransactionReceipt: TransactionReceipt = {
  status: true,
  transactionHash: "",
  transactionIndex: 1,
  blockHash: "",
  blockNumber: 1,
  from: "",
  to: "",
  cumulativeGasUsed: 1,
  gasUsed: 1,
  logs: [],
  logsBloom: ""
};
