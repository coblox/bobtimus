import { from, Observable } from "rxjs";
import { ComitNode } from "./comit_node";
import { Config } from "./config";
import { Entity } from "../gen/siren";
import { flatMap } from "rxjs/operators";

let config = new Config("./config.toml");
const comitNode = new ComitNode(config);

export function poll<T>(observable: Observable<T>): Observable<Entity> {
  return observable
    .pipe(() => comitNode.getSwaps())
    .pipe(flatMap(swap => from(swap)));
}
