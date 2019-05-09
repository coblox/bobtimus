import { from, timer } from "rxjs";
import { poll } from "./action_poller";
import { Datastore } from "./datastore";
import { ActionExecutor } from "./action_executor";
import { ActionProcessor } from "./action_processor";
import { flatMap, map } from "rxjs/operators";

const datastore = new Datastore();
const actionExecutor = new ActionExecutor(datastore);
const actionProcessor = new ActionProcessor(actionExecutor);

poll(timer(0, 500))
  .pipe(map(swap => actionProcessor.process(swap)))
  .pipe(flatMap(action_response => from(action_response)))
  .subscribe(
    swap => console.log("success: " + swap),
    error => console.error("error: " + error),
    () => console.log("done")
  );
