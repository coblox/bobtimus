import { timer } from "rxjs";
import { poll } from "./action_poller";

poll(timer(0, 500)).subscribe(
  swap => console.log("success: " + swap),
  error => console.error("error: " + error),
  () => console.log("done")
);
