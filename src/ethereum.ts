import { Field } from "../gen/siren";
import { FieldClass } from "./comit_node_api";

export function getData(field: Field): string {
  const classes = field.class;

  if (!classes.some((e: FieldClass) => e === "ethereum")) {
    throw new Error(
      "ethereum.getData should only be use for field with class `ethereum`",
    );
  }

  if (classes.some((e: FieldClass) => e === "address")) {
    return "0x03a329c0248369a73afac7f9381e02fb43d2ea72";
  } else {
    throw new Error("class on field is not supported.");
  }
}
