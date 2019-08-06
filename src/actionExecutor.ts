import { Result } from "@badrap/result/dist";
import { Transaction } from "bitcoinjs-lib";
import BN from "bn.js";
import { Action } from "../gen/siren";
import { networkFromString, Satoshis } from "./bitcoin/blockchain";
import { ComitNode, hexToBN, hexToBuffer, LedgerAction } from "./comitNode";
import { FieldDataSource } from "./fieldDataSource";
import { ILedgerExecutor } from "./ledgerExecutor";
import { getLogger } from "./logging/logger";

const logger = getLogger();

export class ActionExecutor {
  private datastore: FieldDataSource;
  private comitClient: ComitNode;
  private ledgerExecutor: ILedgerExecutor;
  private executedActions: Action[];

  constructor(
    comitClient: ComitNode,
    datastore: FieldDataSource,
    ledgerExecutor: ILedgerExecutor
  ) {
    this.datastore = datastore;
    this.comitClient = comitClient;
    this.ledgerExecutor = ledgerExecutor;
    this.executedActions = [];
  }

  public async execute(
    action: Action,
    maxRetries: number,
    timeout: number = 30000
  ): Promise<Result<any, Error>> {
    if (this.wasExecuted(action)) {
      return Result.err(new Error(`Action already executed: ${action}`));
    }

    let result: Result<any, Error>;

    const triggerResult = await this.triggerRequestFromAction(action);
    logger.log(
      "trace",
      `Response from action: ${JSON.stringify(triggerResult)}`
    );
    result = triggerResult;
    // If the response has a type and payload then a ledger action is needed
    if (triggerResult.isOk) {
      const response = triggerResult.unwrap();
      if (response.type && response.payload) {
        result = await this.executeLedgerAction(response);
        logger.debug(`executeLedgerAction response: ${JSON.stringify(result)}`);
      }
    }

    if (result.isOk) {
      this.executedActions.push(action);
    } else if (maxRetries <= 0) {
      logger.debug("Result error:", result);
      result = Result.err(new Error("Maximum number of retries reached"));
    } else {
      // It failed, try again in x milliseconds
      await sleep(timeout);
      return this.execute(action, maxRetries - 1, timeout);
    }

    return result;
  }

  public async triggerRequestFromAction(action: Action) {
    const data: any = {};

    for (const field of action.fields || []) {
      const value = await this.datastore.getData(field);
      if (value) {
        data[field.name] = value;
      }
    }

    if (action.method === "POST" && action.type !== "application/json") {
      logger.error("Only 'application/json' action type is supported.");
      throw new Error("Only 'application/json' action type is supported.");
    }
    try {
      // If query fails, Promise fails and it throws
      const response = await this.comitClient.request(
        action.method,
        action.href,
        data
      );
      return Result.ok(response);
    } catch (err) {
      return Result.err(err);
    }
  }

  private wasExecuted(action: Action) {
    if (
      this.executedActions.find(
        executedAction => executedAction.href === action.href
      )
    ) {
      logger.debug(`Cannot execute action twice: ${JSON.stringify(action)}!`);
      return true;
    } else {
      return false;
    }
  }

  private async executeLedgerAction(action: LedgerAction) {
    logger.log("trace", `Execute Ledger Action: ${JSON.stringify(action)}`);
    try {
      const network = action.payload.network;
      switch (action.type) {
        case "bitcoin-send-amount-to-address": {
          const satoshis = new Satoshis(action.payload.amount);
          const result = await this.ledgerExecutor.bitcoinPayToAddress(
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
              this.ledgerExecutor.bitcoinGetBlockTime(network)
            );
          }

          const transaction = Transaction.fromHex(action.payload.hex);
          const result = await this.ledgerExecutor.bitcoinBroadcastTransaction(
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
          const result = await this.ledgerExecutor.ethereumDeployContract(
            params
          );
          return Result.ok(result);
        }
        case "ethereum-call-contract": {
          const minBlockTimestamp = action.payload.min_block_timestamp;
          if (minBlockTimestamp) {
            await sleepTillBlockchainTimeReached(minBlockTimestamp, () =>
              this.ledgerExecutor.ethereumGetTimestamp(network)
            );
          }

          const params = {
            gasLimit: hexToBN(action.payload.gas_limit),
            to: action.payload.contract_address,
            network: action.payload.network,
            data: action.payload.data
          };
          const result = await this.ledgerExecutor.ethereumSendTransactionTo(
            params
          );
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
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
