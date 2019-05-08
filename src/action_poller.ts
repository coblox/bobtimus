import {from, Observable} from "rxjs";
import {Result} from "@badrap/result/dist";
import {Response} from "request";
import {flatMap, map, mergeMap} from "rxjs/operators";
import {ComitNode} from "./comit_node_api";
import {ActionProcessor} from "./action_processor";


const comitNode = new ComitNode();
const actionProcessor = new ActionProcessor();


export function start<T>(observable: Observable<T>): Observable<Result<Response, Error>> {
    return observable
        .pipe(() => from(comitNode.getSwaps()))
        .pipe(mergeMap(swap =>
            from(swap)
                .pipe(map(swap => actionProcessor.process(swap)))))
        .pipe(flatMap(action_response => from(action_response)));

}