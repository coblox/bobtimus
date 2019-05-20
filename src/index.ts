import { from, timer } from "rxjs";
import { filter, flatMap, map, tap } from "rxjs/operators";
import { ActionExecutor } from "./actionExecutor";
import poll from "./actionPoller";
import { ActionSelector } from "./actionSelector";
import { Config } from "./config";
import { Datastore } from "./datastore";

const config = new Config("./config.toml");
const datastore = new Datastore();
const actionSelector = new ActionSelector(config);
const actionExecutor = new ActionExecutor(config, datastore);

poll(timer(0, 500))
  .pipe(map(swap => actionSelector.selectAction(swap)))
  .pipe(tap(result => console.log("Result:", result)))
  .pipe(filter(result => result.isOk))
  .pipe(map(actionResult => actionResult.unwrap()))
  .pipe(map(action => actionExecutor.execute(action)))
  .pipe(flatMap(actionResponse => from(actionResponse)))
  .subscribe(
    swap => console.log("success: " + swap),
    error => console.error("error: " + error),
    () => console.log("done")
  );
