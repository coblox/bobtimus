import { Result } from "@badrap/result/dist";
import { Transaction } from "bitcoinjs-lib";
import BN from "bn.js";
import debug from "debug";
import request from "request-promise-native";
import URI from "urijs";
import { Action } from "../gen/siren";
import { networkFromString, Satoshis } from "./bitcoin/blockchain";
import { hexToBN, hexToBuffer, LedgerAction } from "./comitNode";
import { Config } from "./config";
import { IDatastore } from "./datastore";
import { ILedgerExecutor } from "./ledgerExecutor";

const log = debug("bobtimus:actionExecutor");

export class ActionExecutor {
  private datastore: IDatastore;
  private config: Config;
  private ledgerExecutor: ILedgerExecutor;

  constructor(
    config: Config,
    datastore: IDatastore,
    ledgerExecutor: ILedgerExecutor
  ) {
    this.datastore = datastore;
    // TODO: Replace that with a comit Client interface that executes the request for you
    // Or strip down to the url
    this.config = config;
    this.ledgerExecutor = ledgerExecutor;
  }

  public async execute(action: Action) {
    const options = await this.buildRequestFromAction(action);
    log(
      `Doing a ${options.method} request to ${
        options.uri
      } with body: ${JSON.stringify(options.body)}`
    );

    const response = await request(options);
    // If the response has a type and payload then a ledger action is needed
    if (response.type && response.payload) {
      return this.executeLedgerAction(response);
    }
    return response;
  }

  public async buildRequestFromAction(action: Action) {
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

    const method = action.method || "GET";
    if (method === "GET") {
      return {
        method,
        uri: this.config
          .prependUrlIfNeeded(action.href)
          .query(URI.buildQuery(data))
          .toString(),
        json: true
      };
    } else {
      return {
        method,
        uri: this.config.prependUrlIfNeeded(action.href).toString(),
        body: data,
        json: true
      };
    }
  }

  private async executeLedgerAction(action: LedgerAction) {
    console.log(`Execute Ledger Action: ${JSON.stringify(action)}`);
    // TODO: check return of rpc calls before saying it's "ok"
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
            gasLimit: new BN(action.payload.gas_limit),
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
