import { Field } from "../gen/siren";
import { EthereumClient } from "./ethereum";

export class Datastore {
  public ethereumClient: EthereumClient;

  constructor() {
    this.ethereumClient = new EthereumClient();
  }

  public async getData(field: Field) {
    if (
      field.class.some((e: string) => e === "ethereum") &&
      field.class.some((e: string) => e === "address")
    ) {
      return await this.ethereumClient.getAddress();
    }
  }
}
