import debug from "debug";
import request from "request-promise-native";

const log = debug("bobtimus:bitcoin:feeservice");

export class FeeService {
  public static default() {
    return new FeeService(10, "hourFee");
  }

  private defaultFee: number;
  private defaultStrategy: string;

  constructor(defaultFee: number, defaultStrategy: string) {
    this.defaultFee = defaultFee;
    this.defaultStrategy = defaultStrategy;
  }

  public async retrieveSatsPerByte(strategyName?: string) {
    const strategy = strategyName ? strategyName : this.defaultStrategy;

    const options = {
      method: "GET",
      url: "https://bitcoinfees.earn.com/api/v1/fees/recommended",
      json: true,
      timeout: 1000
    };

    try {
      const response = await request(options);
      const fee = response[strategy];
      if (!fee) {
        log(`Strategy not found ${strategy}`);
        return this.defaultFee;
      }
      return fee;
    } catch (err) {
      log(`Could not retrieve fees from feeservice: ${err}`);
      return this.defaultFee;
    }
  }
}
