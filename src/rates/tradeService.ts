import Big from "big.js";
import Asset from "../asset";
import Ledger from "../ledger";
import { getLogger } from "../logging/logger";
import Tokens from "../tokens";
import { BitcoinWallet } from "../wallets/bitcoin";
import { EthereumWallet } from "../wallets/ethereum";
import Balances, { BalanceLookups } from "./balances";
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

export interface Offer {
  protocol: string;
  timestamp: Date;
  buy: TradeAmount;
  sell: TradeAmount;
}

export interface TradeService {
  isOfferAcceptable: (offer: Offer) => Promise<boolean>;
  prepareOffersToPublish: () => Promise<Offer[]>;
}

export interface InitialiseRateParameters {
  testnetMarketMaker?: TestnetMarketMakerConfig;
  staticRates?: ConfigRates;
  lowBalanceThresholdPercentage?: number;
  ethereumWallet?: EthereumWallet;
  bitcoinWallet?: BitcoinWallet;
  tokens?: Tokens;
}

export async function createTradeEvaluationService({
  testnetMarketMaker,
  staticRates,
  lowBalanceThresholdPercentage,
  ethereumWallet,
  bitcoinWallet,
  tokens
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

    const nativeAssetBalanceLookups: BalTuple[] = [
      [Asset.bitcoin.toMapKey(), bitcoinBalanceLookup],
      [Asset.ether.toMapKey(), etherBalanceLookup]
    ];

    const getTokens = tokens
      ? (ledger: Ledger) => tokens.getAssets(ledger)
      : () => [];

    type BalTuple = [string, () => Promise<Big>];

    let ethTokensBalanceLookups: BalTuple[] = [];

    if (tokens && ethereumWallet) {
      const ethTokens = tokens.getAssets(Ledger.Ethereum);

      const promises = ethTokens.map(
        (token: Asset): BalTuple => {
          const fn = () => ethereumWallet.getBalance(token);
          return [token.toMapKey(), fn];
        }
      );
      ethTokensBalanceLookups = await Promise.all(promises);
    }

    const allLookups: BalTuple[] = nativeAssetBalanceLookups.concat(
      ethTokensBalanceLookups
    );

    const balances = await Balances.new(
      lowBalanceThresholdPercentage,
      new BalanceLookups(allLookups)
    );

    return new TestnetMarketMaker(
      testnetMarketMakerConfig,
      balances,
      getTokens
    );
  } else {
    throw new Error("No rate strategy defined.");
  }
}
