import Big from "big.js";
import { getLogger } from "log4js";
import { List } from "underscore";
import Asset from "../asset";
import Ledger from "../ledger";
import { Trade, TradeAmountPair, TradeService } from "./tradeService";

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

  public calculateAmountsToPublish(): Promise<List<TradeAmountPair>> {
    const BTC_ETH = this.configRates.bitcoin.ether;
    const ETH_BTC = this.configRates.ether.bitcoin;

    if (!BTC_ETH || !ETH_BTC) {
      throw new Error("Static rates not properly configured");
    }

    return Promise.resolve([
      {
        buy: {
          ledger: Ledger.Bitcoin,
          asset: Asset.Bitcoin,
          quantity: new Big(1)
        },
        sell: {
          ledger: Ledger.Ethereum,
          asset: Asset.Ether,
          quantity: new Big(BTC_ETH)
        }
      },
      {
        buy: {
          ledger: Ledger.Ethereum,
          asset: Asset.Ether,
          quantity: new Big(1)
        },
        sell: {
          ledger: Ledger.Bitcoin,
          asset: Asset.Bitcoin,
          quantity: new Big(ETH_BTC)
        }
      }
    ]);
  }
}
