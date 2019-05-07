import { triggerAction } from "./action_handler";
import { ComitNode, Swap } from "./comit_node_api";
import { selectAction } from "./decision";

// Modules
// comit-node-api: handle queries to comit node and configuration of end point?
// config: handle parsing of configuration

const comitNode = new ComitNode();

async function processSwaps() {
  const swaps = await comitNode.getSwaps();

  swaps.forEach(async (entity: any) => {
    if (entity.class.some((e: string) => e === "swap")) {
      const swap = entity as Swap;

      const nextAction = selectAction(swap);

      if (nextAction.isOk) {
        const action = nextAction.unwrap();
        console.log("Will do " + action.title);
        await triggerAction(action);
      }
    }
  });
}

processSwaps();
