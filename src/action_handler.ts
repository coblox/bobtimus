import { Result } from "@badrap/result/dist";
import { Response } from "request";
import request from "request-promise-native";
import { Action, Field } from "../gen/siren";
import config from "./config";
import { Datastore } from "./datastore";

class ActionRequestError extends Error {
  public response?: Response;

  constructor(message: string, response?: Response) {
    super();
    this.message = message;
    this.response = response;
  }
}

export class ActionTriggerer {
  public datastore: Datastore;

  constructor(datastore: Datastore) {
    this.datastore = datastore;
  }

  public async triggerAction(
    action: Action,
  ): Promise<Result<Response, ActionRequestError>> {
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
      "Doing a " +
        action.method +
        " request to " +
        url +
        " with body: " +
        JSON.stringify(body),
    );

    const options = {
      method: action.method,
      url,
      body,
      json: true,
    };

    try {
      const response = await request(options);
      return Result.ok(response);
    } catch (err) {
      return Result.err(new ActionRequestError("HTTP request failed", err));
    }
  }

  public async retrieveDataForField(field: Field): Promise<any> {
    const data = await this.datastore.getData(field);

    const res: any = {};
    res[field.name] = data;
    return res;
  }
}
