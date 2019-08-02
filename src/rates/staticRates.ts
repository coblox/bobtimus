import Big from "big.js";
import { getLogger } from "log4js";
import Asset from "../asset";
import Ledger from "../ledger";
import { Offer, TradeService } from "./tradeService";

const logger = getLogger();

interface ConfigRate {
  [sellAsset: string]: number; // Value is the rate
}

export interface ConfigRates {
  [buyAsset: string]: ConfigRate;
}

export default class StaticRates implements TradeService {
  private readonly configRates: ConfigRates;
  constructor(configRates: ConfigRates) {
    this.configRates = configRates;
  }

  public isOfferAcceptable({ buy, sell }: Offer) {
    const rate = this.configRates[buy.asset.name][sell.asset.name];

    if (!rate) {
      logger.warn(
        `Rate not configured for buy: ${buy.asset}, sell: ${sell.asset}`
      );
      return Promise.resolve(false);
    }

    const maxSell = buy.quantity.mul(rate);

    return Promise.resolve(maxSell.gte(sell.quantity));
  }

  public prepareOffersToPublish(): Promise<Offer[]> {
    const BTC_ETH = this.configRates.bitcoin.ether;
    const ETH_BTC = this.configRates.ether.bitcoin;

    if (!BTC_ETH || !ETH_BTC) {
      throw new Error("Static rates not properly configured");
    }

    return Promise.resolve([
      {
        protocol: "rfc003",
        timestamp: new Date(),
        buy: {
          ledger: Ledger.Bitcoin,
          asset: Asset.bitcoin,
          quantity: new Big(1)
        },
        sell: {
          ledger: Ledger.Ethereum,
          asset: Asset.ether,
          quantity: new Big(BTC_ETH)
        }
      },
      {
        protocol: "rfc003",
        timestamp: new Date(),
        buy: {
          ledger: Ledger.Ethereum,
          asset: Asset.ether,
          quantity: new Big(1)
        },
        sell: {
          ledger: Ledger.Bitcoin,
          asset: Asset.bitcoin,
          quantity: new Big(ETH_BTC)
        }
      }
    ]);
  }
}
