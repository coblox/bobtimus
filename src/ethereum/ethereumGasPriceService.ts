import BN = require("bn.js");
import debug from "debug";
import request from "request-promise-native";

const log = debug("bobtimus:ethereum:gasService");

export class EthereumGasPriceService {
  public static default() {
    return new EthereumGasPriceService(new BN(10), "average");
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
      const gasPrice = response[strategy];
      if (!gasPrice) {
        log(`Strategy not found ${strategy}`);
        return this.defaultGasPrice;
      }
      return new BN(gasPrice);
    } catch (err) {
      log(`Could not retrieve fees from feeservice: ${err}`);
      return this.defaultGasPrice;
    }
  }
}
