import {from, Observable} from "rxjs";
import {Response} from "request";
import {flatMap, map, mergeMap} from "rxjs/operators";
import {ComitNode} from "./comit_node_api";
import {ActionProcessor} from "./action_processor";
import {ActionTriggerer} from "./action_triggerer";
import {Datastore} from "./datastore";


const datastore = new Datastore();
const comitNode = new ComitNode();
const actionTriggerer = new ActionTriggerer(datastore);
const actionProcessor = new ActionProcessor(actionTriggerer);


export function start<T>(observable: Observable<T>): Observable<Response> {
    return observable
        .pipe(() => comitNode.getSwaps())
        .pipe(mergeMap(swap =>
            from(swap)
                .pipe(map(swap => actionProcessor.process(swap)))))
        .pipe(flatMap(action_response => from(action_response)));
}
