import { Result } from "@badrap/result/dist";
import { Transaction } from "bitcoinjs-lib";
import BN from "bn.js";
import debug from "debug";
import { Action } from "../gen/siren";
import { networkFromString, Satoshis } from "./bitcoin/blockchain";
import { ComitNode, hexToBN, hexToBuffer, LedgerAction } from "./comitNode";
import { FieldDataSource } from "./fieldDataSource";
import { ILedgerExecutor } from "./ledgerExecutor";

const log = debug("bobtimus:actionExecutor");

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

  public async execute(action: Action, maxRetries: number) {
    if (this.wasExecuted(action)) {
      log("Action already executed");
      return Result.err(new Error(`Action already executed: ${action}`));
    }

    let result: Result<any, Error>;

    const triggerResult = await this.triggerRequestFromAction(action);
    log(`Response from action: ${JSON.stringify(triggerResult)}`);
    result = triggerResult;
    // If the response has a type and payload then a ledger action is needed
    if (triggerResult.isOk) {
      const response = triggerResult.unwrap();
      if (response.type && response.payload) {
        result = await this.executeLedgerAction(response);
        log(`executeLedgerAction response: ${JSON.stringify(result)}`);
      }
    }

    if (result.isOk) {
      this.executedActions.push(action);
    } else if (maxRetries <= 0) {
      result = Result.err(new Error("Maximum number of retries reached"));
    } else {
      // It failed, try again in 30 s
      setInterval(() => {
        this.execute(action, maxRetries - 1);
      }, 30000);
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
      log(`Cannot execute action twice: ${JSON.stringify(action)}!`);
      return true;
    } else {
      return false;
    }
  }

  private async executeLedgerAction(action: LedgerAction) {
    log(`Execute Ledger Action: ${JSON.stringify(action)}`);
    try {
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
          const transaction = Transaction.fromHex(action.payload.hex);
          const result = await this.ledgerExecutor.bitcoinBroadcastTransaction(
            transaction
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
