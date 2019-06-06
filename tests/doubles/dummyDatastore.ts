import { Field } from "../../gen/siren";
import { FieldDataSource } from "../../src/fieldDataSource";

export default class DummyDatastore implements FieldDataSource {
  public getData(field: Field) {
    throw new Error(
      `getData should not be called for ${JSON.stringify(field)}`
    );
  }
}
