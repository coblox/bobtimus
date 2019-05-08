import {from, timer} from "rxjs";
import {ActionHandler} from "./action_handler";
import {ComitNode, Swap} from "./comit_node_api";
import {selectAction} from "./decision";
import {Entity} from "../gen/siren";
import {map, mergeMap} from 'rxjs/operators';
import {Result} from "@badrap/result/dist";
import {Response} from "request";

// Modules
// comit-node-api: handle queries to comit node and configuration of end point?
// config: handle parsing of configuration

const comitNode = new ComitNode();
const actionHandler = new ActionHandler();

async function process(entity: Entity): Promise<Result<Response, Error>> {
    if (entity.class && entity.class.some((e: string) => e === "swap")) {
        const swap = entity as Swap;

        const nextAction = selectAction(swap);

        if (nextAction.isOk) {
            const action = nextAction.unwrap();
            console.log("Will do " + action.title);
            return actionHandler.triggerAction(action);
        }
    }
    return Result.err(new Error("Internal Error"));
}

timer(0, 500)
    .pipe(() => from(comitNode.getSwaps()))
    .pipe(mergeMap(swap => from(swap).pipe(map(swap => process(swap)))))
    .pipe(action => from(action))
    .subscribe(
        (swap) => console.log("success: " + swap),
        (error) => console.error("error: " + error),
        () => console.log("dosne")
    );
