import { Field } from "../gen/siren";

declare module "ethereum" {
  export function getData(field: Field): string;
}
