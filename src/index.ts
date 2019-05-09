import { timer } from "rxjs";
import { start } from "./action_poller";

start(timer(0, 500)).subscribe(
  swap => console.log("success: " + swap),
  error => console.error("error: " + error),
  () => console.log("done")
);
