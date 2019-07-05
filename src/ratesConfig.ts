import Big from "big.js";
import { getLogger } from "log4js";
import Asset from "./asset";

const logger = getLogger();

export interface TradeAmounts {
  buyAsset: Asset;
  sellAsset: Asset;
  buyNominalAmount: Big;
  sellNominalAmount: Big;
}

export type RatesConfig = {
  [buyAsset in Asset]: { [sellAsset in Asset]?: number }
};

/// Returns Buy divided by Sell (Sell-Beta in exchange terms) rate based on the configuration
export function isTradeAcceptable(
  { buyAsset, sellNominalAmount, buyNominalAmount, sellAsset }: TradeAmounts,
  ratesConfig: RatesConfig
) {
  const rate = ratesConfig[buyAsset][sellAsset];

  if (!rate) {
    logger.error(
      `Rate not configured for buy: ${buyAsset}, sell: ${sellAsset}`
    );
    return false;
  }

  const maxSell = buyNominalAmount.mul(rate);

  return maxSell.gte(sellNominalAmount);
}
