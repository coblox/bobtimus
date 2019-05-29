import { Field } from "../../gen/siren";
import { Datastore } from "../../src/datastore";

export default class DummyDatastore implements Datastore {
  public getData(field: Field) {
    throw new Error(
      `getData should not be called for ${JSON.stringify(field)}`
    );
  }
}
