import { Response } from "request";
import request from "request-promise-native";
import { Action } from "../gen/siren";
import { Datastore } from "./datastore";
import { Config } from "./config";

export class ActionExecutor {
  private datastore: Datastore;
  private config: Config;

  constructor(config: Config, datastore: Datastore) {
    this.datastore = datastore;
    this.config = config;
  }

  public async execute(action: Action): Promise<Response> {
    const options = await this.buildRequestFromAction(action);

    console.log(
      `Doing a ${options.method} request to ${
        options.uri
      } with body: ${JSON.stringify(options.body)}`
    );

    return request(options);
  }

  async buildRequestFromAction(action: Action) {
    let data: any = {};

    for (let field of action.fields || []) {
      let value = await this.datastore.getData(field);
      if (value) {
        data[field.name] = value;
      }
    }

    let method = action.method || "GET";
    if (method === "GET") {
      return {
        method: method,
        uri: this.config
          .prependUrlIfNeeded(action.href)
          .query(URI.buildQuery(data))
          .toString(),
        body: {},
        json: false
      };
    } else {
      return {
        method: method,
        uri: this.config.prependUrlIfNeeded(action.href).toString(),
        body: data,
        json: action.type === "application/json"
      };
    }
  }
}
