import Big from "big.js";
import debug = require("debug");
import { Asset } from "./asset";
const log = debug("bobtimus:rates");

export interface TradeAmounts {
  buyAsset: Asset;
  sellAsset: Asset;
  buyNominalAmount: Big;
  sellNominalAmount: Big;
}

export type RatesConfig = {
  [buyAsset in Asset]: {
    [sellAsset in Asset]?: {
      maxSell: number;
    }
  }
};

/// Returns Buy divided by Sell (Sell-Beta in exchange terms) rate based on the configuration
export function isTradeAcceptable(
  tradeAmounts: TradeAmounts,
  ratesConfig: RatesConfig
) {
  const buyAsset = tradeAmounts.buyAsset;
  const buyAmount = tradeAmounts.buyNominalAmount;
  const sellAsset = tradeAmounts.sellAsset;
  const sellAmount = tradeAmounts.sellNominalAmount;
  const rate = ratesConfig[buyAsset][sellAsset];

  if (!rate || !rate.maxSell) {
    log(`Rate not configured for buy: ${buyAsset}, sell: ${sellAsset}`);
    return false;
  }
  const maxSellForAmountOne = rate.maxSell;

  const maxSell = buyAmount.mul(maxSellForAmountOne);

  return maxSell.gte(sellAmount);
}
