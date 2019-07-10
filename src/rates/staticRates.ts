import Big from "big.js";
import { getLogger } from "log4js";
import Asset from "../asset";
import { TradeEvaluationService } from "./tradeEvaluationService";

const logger = getLogger();

export interface TradeAmounts {
  buyAsset: Asset;
  sellAsset: Asset;
  buyNominalAmount: Big;
  sellNominalAmount: Big;
}

export type ConfigRates = {
  [buyAsset in Asset]: { [sellAsset in Asset]?: number }
};

export default class StaticRates implements TradeEvaluationService {
  private readonly configRates: ConfigRates;
  constructor(configRates: ConfigRates) {
    this.configRates = configRates;
  }

  public isTradeAcceptable({
    buyAsset,
    sellNominalAmount,
    buyNominalAmount,
    sellAsset
  }: TradeAmounts) {
    const rate = this.configRates[buyAsset][sellAsset];

    if (!rate) {
      logger.warn(
        `Rate not configured for buy: ${buyAsset}, sell: ${sellAsset}`
      );
      return Promise.resolve(false);
    }

    const maxSell = buyNominalAmount.mul(rate);

    return Promise.resolve(maxSell.gte(sellNominalAmount));
  }
}
