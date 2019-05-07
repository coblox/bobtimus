import { Result } from "@badrap/result/dist";
import { Response } from "request";
import * as request from "request-promise-native";
import { Action, Field } from "../gen/siren";
import config from "./config";
import * as ethereum from "./ethereum";

class ActionRequestError extends Error {
  public response?: Response;

  constructor(message: string, response?: Response) {
    super();
    this.message = message;
    this.response = response;
  }
}

export async function triggerAction(
  action: Action,
): Promise<Result<void, Error>> {
  switch (action.method) {
    case "POST": {
      const res = await postRequest(action);
      if (res.isErr) {
        console.log(JSON.stringify(res.error));
        return Result.err(new Error("Action trigger failed"));
      }
      return Result.ok(undefined);
    }
    case "GET": {
      return Result.err(new Error("Cannot handle GET action method"));
    }
    case "PUT": {
      return Result.err(new Error("Cannot handle PUT action method"));
    }
    case "DELETE": {
      return Result.err(new Error("Cannot handle DELETE action method"));
    }
    case "PATCH": {
      return Result.err(new Error("Cannot handle PATCH action method"));
    }
    default: {
      return Result.err(new Error("Internal Error"));
    }
  }
}

async function postRequest(
  action: Action,
): Promise<Result<Response, ActionRequestError>> {
  if (action.method !== "POST") {
    return Result.err(
      new ActionRequestError("postRequest should only be used for POST actions"),
    );
  }

  let body: any = {};

  if (action.fields) {
    action.fields.forEach((field) => {
      const data: any = retrieveDataForField(field);
      body = { ...body, ...data };
    });
  }
  const url = config.prependUrlIfNeeded(action.href);
  console.log(
    "Doing a POST request to " + url + " with body: " + JSON.stringify(body),
  );
  try {
    const response = await request.post({
      uri: url,
      body,
      json: true,
    });

    if (response.statusCode.toString().startsWith("2")) {
      return Result.ok(response);
    } else {
      return Result.err(
        new ActionRequestError(
          "HTTP request returned a bad status code",
          response,
        ),
      );
    }
  } catch (err) {
    return Result.err(new ActionRequestError("HTTP request failed", err));
  }
}

function retrieveDataForField(field: Field): any {
  if (field.class.some((e: string) => e === "ethereum")) {
    const data = ethereum.getData(field);

    const res: any = {};
    res[field.name] = data;
    return res;
  }
}
