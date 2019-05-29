import { Result } from "@badrap/result/dist";
import { Transaction } from "bitcoinjs-lib";
import BN from "bn.js";
import debug from "debug";
import { Action } from "../gen/siren";
import { networkFromString, Satoshis } from "./bitcoin/blockchain";
import { ComitNode, hexToBN, hexToBuffer, LedgerAction } from "./comitNode";
import { IDatastore } from "./datastore";
import { ILedgerExecutor } from "./ledgerExecutor";

const log = debug("bobtimus:actionExecutor");

export class ActionExecutor {
  private datastore: IDatastore;
  private comitClient: ComitNode;
  private ledgerExecutor: ILedgerExecutor;

  constructor(
    comitClient: ComitNode,
    datastore: IDatastore,
    ledgerExecutor: ILedgerExecutor
  ) {
    this.datastore = datastore;
    this.comitClient = comitClient;
    this.ledgerExecutor = ledgerExecutor;
  }

  public async execute(action: Action) {
    const response = await this.triggerRequestFromAction(action);

    // If the response has a type and payload then a ledger action is needed
    if (response.type && response.payload) {
      return this.executeLedgerAction(response);
    }
    return response;
  }

  public async triggerRequestFromAction(action: Action) {
    const data: any = {};

    for (const field of action.fields || []) {
      const value = await this.datastore.getData(field);
      if (value) {
        data[field.name] = value;
      }
    }

    if (action.type !== "application/json") {
      throw new Error("Only 'application/json' action type is supported.");
    }
    return this.comitClient.request(action.method, action.href, data);
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
            network: action.payload.network
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
