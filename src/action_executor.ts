import {Response} from "request";
import request from "request-promise-native";
import {Action, Field} from "../gen/siren";
import config from "./config";
import {Datastore} from "./datastore";


export class ActionExecutor {
  public datastore: Datastore;

  constructor(datastore: Datastore) {
    this.datastore = datastore;
  }

  public async execute(
    action: Action,
  ): Promise<Response> {
    let body: any = {};
    let url = config.prependUrlIfNeeded(action.href);

    if (action.fields) {
      const promises = action.fields.map(async (field) => {
        const data: any = await this.retrieveDataForField(field);
        if (data) {
          if (action.method === "GET") {
            console.log(data);
            url += "?";
            url += Object.entries(data)
              .map(([key, val]) => `${key}=${val}`)
              .join("&");
          } else {
            body = { ...body, ...data };
          }
        }
      });
      await Promise.all(promises);
    }

    console.log(
      `Doing a ${action.method} request to ${url} with body: ${JSON.stringify(body)}`,
    );

    const options = {
      method: action.method,
      url,
      body,
      json: true,
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
