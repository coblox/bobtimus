import {from, Observable} from "rxjs";
import {ComitNode} from "./comit_node_api";
import {flatMap, map, mergeMap} from 'rxjs/operators';
import {ActionProcessor} from "./action_processor";
import {Result} from "@badrap/result/dist";
import {Response} from "request";

// Modules
// comit-node-api: handle queries to comit node and configuration of end point?
// config: handle parsing of configuration

const comitNode = new ComitNode();
const actionProcessor = new ActionProcessor();


export function start(observable: Observable<number>): Observable<Result<Response, Error>> {
    return observable
        .pipe(() => from(comitNode.getSwaps()))
        .pipe(mergeMap(swap =>
            from(swap)
                .pipe(map(swap => actionProcessor.process(swap)))))
        .pipe(flatMap(action_response => from(action_response)));

}

// start(timer(0, 500)).subscribe(
//     (swap) => console.log("success: " + swap),
//     (error) => console.error("error: " + error),
//     () => console.log("done")
// );
