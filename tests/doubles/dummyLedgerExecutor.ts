import { TransactionReceipt } from "web3-core/types";
import { ILedgerExecutor } from "../../src/ledgerExecutor";

export default class DummyLedgerExecutor implements ILedgerExecutor {
  public bitcoinBroadcastTransaction(): Promise<string> {
    throw new Error(`bitcoinBroadcastTransaction should not be called`);
  }
  public bitcoinPayToAddress(): Promise<string> {
    throw new Error(`bitcoinPayToAddress should not be called`);
  }
  public bitcoinGetBlockTime(): Promise<number> {
    throw new Error(`bitcoinBlockTime should not be called`);
  }
  public ethereumGetTimestamp(): Promise<number> {
    throw new Error("ethereumGetTimestamp should not be called");
  }
  public ethereumDeployContract(): Promise<TransactionReceipt> {
    throw new Error(`ethereumDeployContract should not be called`);
  }
  public ethereumSendTransactionTo(): Promise<TransactionReceipt> {
    throw new Error(`ethereumSendTransactionTo should not be called`);
  }
}

export const dummyTransactionReceipt: TransactionReceipt = {
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
