import { from, timer } from "rxjs";
import { default as ActionPoller } from "./action_poller";
import { Datastore } from "./datastore";
import { ActionExecutor } from "./action_executor";
import { filter, flatMap, map, tap } from "rxjs/operators";
import { ActionSelector } from "./action_selector";
import { Config } from "./config";

const config = new Config("./config.toml");
const datastore = new Datastore();
const actionSelector = new ActionSelector(config);
const actionExecutor = new ActionExecutor(config, datastore);

ActionPoller.poll(timer(0, 500))
  .pipe(map(swap => actionSelector.selectAction(swap)))
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
