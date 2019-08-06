import Big from "big.js";
import Asset from "../asset";
import Ledger from "../ledger";
import { getLogger } from "../logging/logger";
import { BitcoinWallet } from "../wallets/bitcoin";
import { EthereumWallet } from "../wallets/ethereum";
import Balances from "./balances";
import StaticRates, { ConfigRates } from "./staticRates";
import TestnetMarketMaker, {
  TestnetMarketMakerConfig
} from "./testnetMarketMaker";

const logger = getLogger();

export interface TradeAmount {
  ledger: Ledger;
  asset: Asset;
  quantity: Big;
}

export interface Trade {
  protocol: string;
  timestamp: Date;
  buy: TradeAmount;
  sell: TradeAmount;
}

export interface TradeService {
  isTradeAcceptable: (trade: Trade) => Promise<boolean>;
  prepareTradesToPublish: () => Promise<Trade[]>;
}

export interface InitialiseRateParameters {
  testnetMarketMaker?: TestnetMarketMakerConfig;
  staticRates?: ConfigRates;
  lowBalanceThresholdPercentage?: number;
  ethereumWallet?: EthereumWallet;
  bitcoinWallet?: BitcoinWallet;
}

export async function createTradeEvaluationService({
  testnetMarketMaker,
  staticRates,
  lowBalanceThresholdPercentage,
  ethereumWallet,
  bitcoinWallet
}: InitialiseRateParameters) {
  const testnetMarketMakerConfig = testnetMarketMaker;
  const staticRatesConfig = staticRates;

  if (testnetMarketMakerConfig && staticRatesConfig) {
    throw new Error("Multiple rate strategies provided.");
  }

  if (staticRatesConfig) {
    return new StaticRates(staticRatesConfig);
  } else if (testnetMarketMakerConfig) {
    if (!lowBalanceThresholdPercentage) {
      throw new Error(
        "lowBalanceThresholdPercentage is needed for testnet Market Maker rate strategy"
      );
    }

    const bitcoinBalanceLookup = async () => {
      try {
        if (bitcoinWallet) {
          return bitcoinWallet.getNominalBalance();
        }
      } catch (e) {
        logger.error("Bitcoin balance not found", e);
      }

      return Promise.resolve(new Big(0));
    };

    const etherBalanceLookup = async () => {
      if (ethereumWallet) {
        try {
          return ethereumWallet.getBalance(Asset.ether);
        } catch (e) {
          logger.error("Ethereum balance not found", e);
        }
      }
      return Promise.resolve(new Big(0));
    };

    const balanceLookups = {
      bitcoin: bitcoinBalanceLookup,
      ether: etherBalanceLookup
    };

    const balances = await Balances.create(
      balanceLookups,
      lowBalanceThresholdPercentage
    );

    return new TestnetMarketMaker(testnetMarketMakerConfig, balances);
  } else {
    throw new Error("No rate strategy defined.");
  }
}
