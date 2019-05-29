import { Field } from "../../gen/siren";
import { Datastore } from "../../src/datastore";

export function getDummDatastore(): Datastore {
  return {
    getData: (field: Field) => {
      throw new Error(
        `getData should not be called for ${JSON.stringify(field)}`
      );
    }
  };
}
