import { getLogger } from "log4js";
import { List } from "underscore";
import Asset from "../asset";
import { Trade, TradeAmounts, TradeService } from "./tradeService";

const logger = getLogger();

export type ConfigRates = {
  [buyAsset in Asset]: { [sellAsset in Asset]?: number };
};

export default class StaticRates implements TradeService {
  private readonly configRates: ConfigRates;
  constructor(configRates: ConfigRates) {
    this.configRates = configRates;
  }

  public isTradeAcceptable({
    buyAsset,
    sellNominalAmount,
    buyNominalAmount,
    sellAsset
  }: Trade) {
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

  public getAmountsToPublish(): Promise<List<TradeAmounts>> {
    throw new Error("not implemented");
  }
}
