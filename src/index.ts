import { triggerAction } from "./action_handler";
import { ComitNode } from "./comit_node_api";
import { selectAction } from "./decision";

// Modules
// comit-node-api: handle queries to comit node and configuration of end point?
// config: handle parsing of configuration

const comitNode = new ComitNode();

const swaps = comitNode.getSwaps();

swaps.forEach(async (swap) => {
  const nextAction = selectAction(swap);
  if (nextAction.isOk) {
    const action = nextAction.unwrap();
    console.log("Will do " + action.title);
    await triggerAction(action);
  }
});
