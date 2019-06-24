import Big from "big.js";
import debug = require("debug");

const log = debug("bobtimus:rates");

export interface Rates {
  [ticker: string]: {
    [base: string]: {
      buy: number;
      sell: number;
    };
  };
}

/// Returns Buy divided by Sell (Sell-Beta in exchange terms) rate based on the configuration
export function getBuyDivBySellRate(
  ratesConfig: Rates,
  buyAsset: string,
  sellAsset: string
) {
  const one = new Big(1);
  switch (buyAsset + sellAsset) {
    case "etherbitcoin": {
      // buys Ether, sells Bitcoin
      if (ratesConfig.bitcoin && ratesConfig.bitcoin.ether) {
        // bitcoin.ether is configured meaning
        // that the "sell" rate is when Bob "sells" bitcoin
        // the stored rate is BTC-ETH or ETH (Buy) divided by BTC (Sell)
        return ratesConfig.bitcoin.ether.sell
          ? new Big(ratesConfig.bitcoin.ether.sell)
          : undefined;
      } else if (ratesConfig.ether && ratesConfig.ether.bitcoin) {
        // ether.bitcoin is configured meaning
        // that the "buy" rate is when Bob buys ether
        // the stored rate is ETH-BTC or BTC (Sell) divided by ETH (Buy)
        // We want to return Buy divided by Sell rate hence need to ⁻¹ it
        return ratesConfig.ether.bitcoin.buy
          ? one.div(new Big(ratesConfig.ether.bitcoin.buy))
          : undefined;
      } else {
        return undefined;
      }
    }
    case "bitcoinether": {
      // Buys Bitcoin, Sell Ether
      if (ratesConfig.bitcoin && ratesConfig.bitcoin.ether) {
        // bitcoin.ether is configured meaning
        // that the "buy" rate is when Bob "buys" bitcoin
        // the stored rate is BTC-ETH or ETH (SEll) divided by BTC (Buy)
        // We want to return Buy divided by Sell rate hence need to ⁻¹ it
        return ratesConfig.bitcoin.ether.buy
          ? one.div(new Big(ratesConfig.bitcoin.ether.buy))
          : undefined;
      } else if (ratesConfig.ether && ratesConfig.ether.bitcoin) {
        // ether.bitcoin is configured meaning
        // that the "sell" rate is when Bob sells ether
        // the stored rate is ETH-BTC or BTC (Sell) divided by ETH (Buy)
        return ratesConfig.ether.bitcoin.sell
          ? new Big(ratesConfig.ether.bitcoin.sell)
          : undefined;
      } else {
        return undefined;
      }
    }
    default: {
      log(`This combination is not yet supported`);
      return undefined;
    }
  }
}

export function isProfitable(
  buyAssetNominalQuantity: Big,
  sellAssetNominalQuantity: Big,
  acceptableBuyDivBySellRate: Big
) {
  const proposedRate = buyAssetNominalQuantity.div(sellAssetNominalQuantity);
  log(
    `Proposed rate: ${proposedRate.toFixed()}, Acceptable rate: ${acceptableBuyDivBySellRate.toFixed()}`
  );

  return proposedRate.gte(acceptableBuyDivBySellRate);
}
