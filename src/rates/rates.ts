import Big from "big.js";
import Asset from "../asset";

export interface TradeAmounts {
  buyAsset: Asset;
  sellAsset: Asset;
  buyNominalAmount: Big;
  sellNominalAmount: Big;
}

export interface Rates {
  isTradeAcceptable: (tradeAmounts: TradeAmounts) => boolean;
}
