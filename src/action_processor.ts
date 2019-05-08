import {Entity} from "../gen/siren";
import {Response} from "request";
import {Swap} from "./comit_node_api";
import {selectAction} from "./decision";
import {ActionTriggerer} from "./action_triggerer";
import {Observable, throwError} from "rxjs";

export class ActionProcessor {
    private actionTriggerer: ActionTriggerer;

    constructor(actionTriggerer: ActionTriggerer) {
        this.actionTriggerer = actionTriggerer;
    }

    public process(entity: Entity): Observable<Response> {
        if (entity.class && entity.class.some((e: string) => e === "swap")) {
            const swap = entity as Swap;

            const nextAction = selectAction(swap);

            if (nextAction.isOk) {
                const action = nextAction.unwrap();
                console.debug("Will do " + action.title);
                return this.actionTriggerer.triggerAction(action);
            } else {
                return throwError(nextAction.error);
            }
        }
        return throwError(new Error("Internal Error"));
    }
}
