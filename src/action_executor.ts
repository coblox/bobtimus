import request from "request-promise-native";
import { Action } from "../gen/siren";
import { Config } from "./config";
import { Datastore } from "./datastore";

export class ActionExecutor {
  private datastore: Datastore;
  private config: Config;

  constructor(config: Config, datastore: Datastore) {
    this.datastore = datastore;
    this.config = config;
  }

  public async execute(action: Action) {
    const options = await this.buildRequestFromAction(action);

    console.log(
      `Doing a ${options.method} request to ${
        options.uri
      } with body: ${JSON.stringify(options.body)}`
    );

    return request(options);
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
      throw new Error(
        "Warning: only 'application/json' action type is supported, use at your own risk."
      );
    }

    const method = action.method || "GET";
    if (method === "GET") {
      return {
        method,
        uri: this.config
          .prependUrlIfNeeded(action.href)
          .query(URI.buildQuery(data))
          .toString(),
        body: {},
        json: false
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
}
