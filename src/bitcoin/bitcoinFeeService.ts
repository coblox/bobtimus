import { getLogger } from "log4js";
import request from "request-promise-native";

const logger = getLogger();

export class BitcoinFeeService {
  public static default() {
    return new BitcoinFeeService(10, "hourFee");
  }

  private defaultFee: number;
  private defaultStrategy: string;

  constructor(defaultFee: number, defaultStrategy: string) {
    this.defaultFee = defaultFee;
    this.defaultStrategy = defaultStrategy;
  }

  public async retrieveSatsPerByte(strategyName?: string): Promise<number> {
    const strategy = strategyName ? strategyName : this.defaultStrategy;

    const options = {
      method: "GET",
      url: "https://bitcoinfees.earn.com/api/v1/fees/recommended",
      json: true,
      timeout: 1000
    };

    try {
      const response = await request(options);
      const fee: number = response[strategy];
      if (!fee) {
        logger.info(
          `Strategy not found ${strategy}, falling back to default fee ${
            this.defaultFee
          }`
        );
        return this.defaultFee;
      }
      logger.debug(`Return fee: ${fee}`);
      return fee;
    } catch (err) {
      logger.info(
        `Could not retrieve fees from Bitcoin feeservice, falling back to default fee ${
          this.defaultFee
        }`,
        err
      );
      return this.defaultFee;
    }
  }
}
