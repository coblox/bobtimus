import BN = require("bn.js");
import debug from "debug";
import request from "request-promise-native";

const log = debug("bobtimus:ethereum:feeservice");

export class EthereumFeeService {
  public static default() {
    return new EthereumFeeService(new BN(10), "average");
  }

  private defaultGasPrice: BN;
  private defaultStrategy: string;

  constructor(defaultGasPrice: BN, defaultStrategy: string) {
    this.defaultGasPrice = defaultGasPrice;
    this.defaultStrategy = defaultStrategy;
  }

  public async retrieveGasPrice(strategyName?: string): Promise<BN> {
    const strategy = strategyName ? strategyName : this.defaultStrategy;

    const options = {
      method: "GET",
      url: "https://ethgasstation.info/json/ethgasAPI.json",
      json: true,
      timeout: 1000
    };

    try {
      const response = await request(options);
      const fee = response[strategy];
      if (!fee) {
        log(`Strategy not found ${strategy}`);
        return this.defaultGasPrice;
      }
      return new BN(fee);
    } catch (err) {
      log(`Could not retrieve fees from feeservice: ${err}`);
      return this.defaultGasPrice;
    }
  }
}
