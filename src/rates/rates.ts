import Big from "big.js";
import Asset from "../asset";
import StaticRates, { ConfigRates } from "./staticRates";
import TestnetMarketMaker, {
  BalanceLookups,
  TestnetMarketMakerConfig
} from "./testnetMarketMaker";

export interface TradeAmounts {
  buyAsset: Asset;
  sellAsset: Asset;
  buyNominalAmount: Big;
  sellNominalAmount: Big;
}

export interface Rates {
  isTradeAcceptable: (tradeAmounts: TradeAmounts) => Promise<boolean>;
}

export interface InitialiseRateParameters {
  testnetMarketMakerConfig?: TestnetMarketMakerConfig;
  configRates?: ConfigRates;
  balanceLookups?: BalanceLookups;
}
export function initialiseRate({
  testnetMarketMakerConfig,
  configRates,
  balanceLookups
}: InitialiseRateParameters): Rates {
  if (testnetMarketMakerConfig && configRates) {
    throw new Error("Multiple rate strategies provided.");
  }

  if (configRates) {
    return new StaticRates(configRates);
  } else if (testnetMarketMakerConfig) {
    if (!balanceLookups) {
      throw new Error(
        "Balance lookup callbacks needed for TestnetMarketMaker stategy."
      );
    }
    return new TestnetMarketMaker(testnetMarketMakerConfig, balanceLookups);
  } else {
    throw new Error("No rate strategy defined.");
  }
}
