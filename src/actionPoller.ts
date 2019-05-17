import { from, Observable } from "rxjs";
import { flatMap } from "rxjs/operators";
import { Entity } from "../gen/siren";
import { ComitNode } from "./comitNode";
import { Config } from "./config";

const config = new Config("./config.toml");
const comitNode = new ComitNode(config);

export default function poll<T>(observable: Observable<T>): Observable<Entity> {
  return observable
    .pipe(() => comitNode.getSwaps())
    .pipe(flatMap(swap => from(swap)));
}
