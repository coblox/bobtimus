import { Field } from "../../gen/siren";
import { IDatastore } from "../../src/datastore";

export function getDatastoreThrowsOnAll(): IDatastore {
  return {
    getData: (field: Field) => {
      throw new Error(
        `getData should not be called for ${JSON.stringify(field)}`
      );
    }
  };
}
