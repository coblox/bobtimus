import { from, timer } from "rxjs";
import { default as ActionPoller } from "./action_poller";
import { Datastore } from "./datastore";
import { ActionExecutor } from "./action_executor";
import { filter, flatMap, map, tap } from "rxjs/operators";
import { selectAction } from "./action_selector";

const datastore = new Datastore();
const actionExecutor = new ActionExecutor(datastore);

ActionPoller.poll(timer(0, 500))
  .pipe(map(swap => selectAction(swap)))
  .pipe(tap(action_result => console.log("Action Result:", action_result)))
  .pipe(filter(action_result => action_result.isOk))
  .pipe(map(action_result => action_result.unwrap()))
  .pipe(map(action => actionExecutor.execute(action)))
  .pipe(flatMap(action_response => from(action_response)))
  .subscribe(
    swap => console.log("success: " + swap),
    error => console.error("error: " + error),
    () => console.log("done")
  );
