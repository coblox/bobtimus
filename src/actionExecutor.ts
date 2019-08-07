import { Result } from "@badrap/result/dist";
import { Action, Field } from "../gen/siren";
import { ComitNode, LedgerAction } from "./comitNode";
import { getLogger } from "./logging/logger";
import sleep from "./sleep";

const logger = getLogger();

export class ActionExecutor {
  private readonly getData: (field: Field) => any;
  private comitClient: ComitNode;
  private readonly executeLedgerAction: (
    ledgerAction: LedgerAction
  ) => Promise<Result<any>>;
  private executedActions: Action[];

  constructor(
    comitClient: ComitNode,
    getData: (field: Field) => any,
    executeLedgerAction: (ledgerAction: LedgerAction) => Promise<Result<any>>
  ) {
    this.getData = getData;
    this.comitClient = comitClient;
    this.executeLedgerAction = executeLedgerAction;
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
    logger.log("trace", `Response from action`, triggerResult);
    result = triggerResult;
    // If the response has a type and payload then a ledger action is needed
    if (triggerResult.isOk) {
      const response = triggerResult.unwrap();
      if (response.type && response.payload) {
        result = await this.executeLedgerAction(response);
        logger.debug(`executeLedgerAction response`, result);
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
      const value = await this.getData(field);
      if (value) {
        data[field.name] = value;
      }
    }

    if (action.method === "POST" && action.type !== "application/json") {
      logger.crit("Only 'application/json' action type is supported.");
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
      logger.debug(`Cannot execute action twice`, action);
      return true;
    } else {
      return false;
    }
  }
}
