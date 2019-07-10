import Big from "big.js";
import { getLogger } from "log4js";
import Asset from "../asset";
import { Config } from "../config";
import { BitcoinWallet } from "../wallets/bitcoin";
import { EthereumWallet } from "../wallets/ethereum";
import StaticRates from "./staticRates";
import TestnetMarketMaker from "./testnetMarketMaker";

const logger = getLogger();

export interface TradeAmounts {
  buyAsset: Asset;
  sellAsset: Asset;
  buyNominalAmount: Big;
  sellNominalAmount: Big;
}

export interface TradeEvaluationService {
  isTradeAcceptable: (tradeAmounts: TradeAmounts) => Promise<boolean>;
}

export interface InitialiseRateParameters {
  config: Config;
  ethereumWallet?: EthereumWallet;
  bitcoinWallet?: BitcoinWallet;
}
export function createTradeEvaluationService({
  config,
  ethereumWallet,
  bitcoinWallet
}: InitialiseRateParameters): TradeEvaluationService {
  const testnetMarketMakerConfig = config.testnetMarketMaker;
  const staticRatesConfig = config.staticRates;

  if (testnetMarketMakerConfig && staticRatesConfig) {
    throw new Error("Multiple rate strategies provided.");
  }

  if (staticRatesConfig) {
    return new StaticRates(staticRatesConfig);
  } else if (testnetMarketMakerConfig) {
    const bitcoinBalanceLookup = async () => {
      try {
        if (bitcoinWallet) {
          return bitcoinWallet.getNominalBalance();
        }
      } catch (e) {
        logger.error("Bitcoin balance not found");
      }

      return Promise.resolve(new Big(0));
    };

    const ethereumBalanceLookup = async () => {
      if (ethereumWallet) {
        try {
          return ethereumWallet.getNominalBalance();
        } catch (e) {
          logger.error("Ethereum balance not found");
        }
      }
      return Promise.resolve(new Big(0));
    };

    const balanceLookups = {
      bitcoin: bitcoinBalanceLookup,
      ether: ethereumBalanceLookup
    };

    return new TestnetMarketMaker(testnetMarketMakerConfig, balanceLookups);
  } else {
    throw new Error("No rate strategy defined.");
  }
}
