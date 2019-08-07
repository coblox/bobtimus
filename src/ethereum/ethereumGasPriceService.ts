import BN = require("bn.js");
import request from "request-promise-native";
import { getLogger } from "../logging/logger";

const logger = getLogger();

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
        logger.info(`Ethereum gas price strategy not found ${strategy}, 
          falling back to default gas price ${this.defaultGasPrice}`);
        return this.defaultGasPrice;
      }
      return new BN(gasPrice);
    } catch (err) {
      logger.info(
        `Could not retrieve fees from Ethereum feeservice, 
        falling back to default gas price ${this.defaultGasPrice}`,
        err
      );
      return this.defaultGasPrice;
    }
  }
}
