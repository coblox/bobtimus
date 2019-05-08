import {Entity} from "../gen/siren";
import {Response} from "request";
import {Swap} from "./comit_node_api";
import {selectAction} from "./decision";
import {ActionTriggerer} from "./action_handler";
import {Datastore} from "./datastore";
import {Observable, throwError} from "rxjs";

export class ActionProcessor {
    private actionHandler: ActionTriggerer;

    constructor() {
        this.actionHandler = new ActionTriggerer(new Datastore());
    }

    public process(entity: Entity): Observable<Response> {
        if (entity.class && entity.class.some((e: string) => e === "swap")) {
            const swap = entity as Swap;

            const nextAction = selectAction(swap);

            if (nextAction.isOk) { //TODO move this out of this function
                const action = nextAction.unwrap();
                console.debug("Will do " + action.title);
                return this.actionHandler.triggerAction(action);
            }
        }
        return throwError(new Error("Internal Error"));
    }
}