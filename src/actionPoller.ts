import { from, Observable } from "rxjs";
import { flatMap } from "rxjs/operators";
import { Entity } from "../gen/siren";
import { ComitNode } from "./comitNode";

export default function poll<T>(
  comitNode: ComitNode,
  observable: Observable<T>
): Observable<Entity> {
  return observable
    .pipe(() => comitNode.getSwaps())
    .pipe(flatMap(swap => from(swap)));
}
