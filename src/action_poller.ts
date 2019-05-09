import { from, Observable } from "rxjs";
import { Response } from "request";
import { flatMap, map, mergeMap } from "rxjs/operators";
import { ComitNode } from "./comit_node";
import { ActionProcessor } from "./action_processor";
import { ActionExecutor } from "./action_executor";
import { Datastore } from "./datastore";
import { Config } from "./config";

const datastore = new Datastore();
let config = new Config("./config.toml");
const comitNode = new ComitNode(config);
const actionExecutor = new ActionExecutor(datastore);
const actionProcessor = new ActionProcessor(actionExecutor);

export function poll<T>(observable: Observable<T>): Observable<Response> {
  return observable
    .pipe(() => comitNode.getSwaps())
    .pipe(
      mergeMap(swap =>
        from(swap).pipe(map(swap => actionProcessor.process(swap)))
      )
    )
    .pipe(flatMap(action_response => from(action_response)));
}
