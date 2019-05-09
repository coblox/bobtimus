import { Response } from "request";
import request from "request-promise-native";
import { Action, Field } from "../gen/siren";
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
    let body: any = {};
    let url = this.config.prependUrlIfNeeded(action.href);

    if (action.fields) {
      const promises = action.fields.map(async field => {
        const data: any = await this.retrieveDataForField(field);
        if (data) {
          if (action.method === "GET") {
            console.log(data);
            Object.entries(data)
              .map(([key, val]) => `${key}=${val}`)
              .forEach(query => url.addQuery(query));
          } else {
            body = { ...body, ...data };
          }
        }
      });
      await Promise.all(promises);
    }

    console.log(
      `Doing a ${action.method} request to ${url} with body: ${JSON.stringify(
        body
      )}`
    );

    const options = {
      method: action.method,
      uri: url.toString(),
      body,
      json: true
    };

    return request(options);
  }

  public async retrieveDataForField(field: Field): Promise<any> {
    const data = await this.datastore.getData(field);

    const res: any = {};
    res[field.name] = data;
    return res;
  }
}
