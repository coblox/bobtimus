import debug from "debug";
import { from, timer } from "rxjs";
import { filter, flatMap, map, tap } from "rxjs/operators";
import { ActionExecutor } from "./actionExecutor";
import poll from "./actionPoller";
import { ActionSelector } from "./actionSelector";
import { ComitNode } from "./comitNode";
import { Config } from "./config";
import { Datastore } from "./datastore";

const info = debug("bobtimus:info:index");
const err = debug("bobtimus:ERROR:index");
const dbg = debug("bobtimus:dbg:index");

const config = Config.fromFile("./config.toml");
const comitNode = new ComitNode(config);
const datastore = new Datastore(config);
const actionSelector = new ActionSelector(config);
const actionExecutor = new ActionExecutor(config, datastore);

poll(comitNode, timer(0, 500))
  .pipe(map(swap => actionSelector.selectAction(swap)))
  .pipe(tap(result => console.log("Result:", result)))
  .pipe(filter(result => result.isOk))
  .pipe(map(actionResult => actionResult.unwrap()))
  .pipe(map(action => actionExecutor.execute(action)))
  .pipe(flatMap(actionResponse => from(actionResponse)))
  .subscribe(
    swap => info("success: " + swap),
    error => err("error: " + error),
    () => dbg("done")
  );
