import {Entity} from "../gen/siren";
import {Result} from "@badrap/result/dist";
import {Response} from "request";
import {Swap} from "./comit_node_api";
import {selectAction} from "./decision";
import {ActionTriggerer} from "./action_handler";
import {Datastore} from "./datastore";

export class ActionProcessor {
    private actionHandler: ActionTriggerer;

    constructor() {
        this.actionHandler = new ActionTriggerer(new Datastore());
    }

    public async process(entity: Entity): Promise<Result<Response, Error>> {
        if (entity.class && entity.class.some((e: string) => e === "swap")) {
            const swap = entity as Swap;

            const nextAction = selectAction(swap);

            if (nextAction.isOk) { //TODO move this out of this function
                const action = nextAction.unwrap();
                console.debug("Will do " + action.title);
                return this.actionHandler.triggerAction(action);
            }
        }
        return Result.err(new Error("Internal Error"));
    }
}