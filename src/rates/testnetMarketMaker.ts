import Big from "big.js";
import Asset from "../asset";
import { getLogger } from "../logging/logger";
import Balances from "./balances";
import { Trade, TradeService } from "./tradeService";

const logger = getLogger();

export interface TestnetMarketMakerConfig {
  rateSpread: number;
  publishFraction: number;
  maxFraction: number;
}

/** Provide the following information:
 * - Published Amounts: to put in the link
 * - Acceptable Rate: minimum rate for which the trade is considered profitable
 * - Max Amounts: cap the max amount to not empty the wallets at once
 *
 * The acceptable rate is simply the ratio of the current available balances. If there is 10 Bitcoin and 100 Ether in
 * the wallets, then the acceptable rate is buy 1 Ether for 0.1 Bitcoin. If Alice buys 1 Ether for 0.1 Bitcoin then
 * the balances changes to 10.1 Bitcoin and 99 Ether so the rate becomes 1 Ether for 0.102... Bitcoin.
 * While this may deplete the balances due to gas/fees, it is the easiest to ensure that old links are accepted
 *
 * The published amounts is the published fraction of the sell asset balance and the buy amount at the published rate.
 * The published rate is the acceptable rate + a configurable spread (e.g. 5%)
 *
 * The max amounts are a configurable fraction of the available balance, which is slightly bigger than the published amount
 *
 */
export default class TestnetMarketMaker implements TradeService {
  private readonly rateSpread: number;
  private readonly publishFraction: number;
  private readonly maxFraction: number;
  private readonly balances: Balances;

  /** Initialize the TestnetMarketMaker class.
   *
   * @param {number} rateSpread The percent spread that is used to calculate the published rate from the acceptable rate
   * @param {number} publishFraction Fraction of the sell asset balance that we publish for trades
   * @param {number} maxFraction Max fraction of the sell asset balance we are happy to trade (ie, trading nth of balance means that you can do n trades at the same time)
   * @param {BalanceLookups} balanceLookups Callbacks that returns the current balance of a given asset
   * @param {Map<Asset, Big>} startupBalances The balance of each asset upon initialization of the market makes to be able to react on low funds.
   * @return {TestnetMarketMaker} The new MarketMaker object
   *
   * Note that {maxFraction} > {publishFraction} must be true or none of the published amounts will be accepted
   */
  public constructor(
    { rateSpread, publishFraction, maxFraction }: TestnetMarketMakerConfig,
    balanceLookups: Balances
  ) {
    if (maxFraction >= publishFraction) {
      throw new Error(
        "MarketMaker maxFraction has to be be less than publishFraction."
      );
    }

    this.rateSpread = rateSpread;
    this.publishFraction = publishFraction;
    this.maxFraction = maxFraction;
    this.balances = balanceLookups;
  }

  /** Provide the trades to publish
   *
   * @param {Asset} buyAsset The asset to buy
   * @param {Asset} sellAsset The asset to sell
   * @return {Trade} trade amounts and metadata to be published
   */
  public async prepareTradesToPublishForAsset(
    buyAsset: Asset,
    sellAsset: Asset
  ): Promise<Trade> {
    const sufficientFunds = await this.balances.isSufficientFunds(sellAsset);
    if (!sufficientFunds) {
      throw new Error(
        `Insufficient funding of asset ${sellAsset.name} to publish trades`
      );
    }

    const buyBalance: Big = await this.balances.getBalance(buyAsset);
    const sellBalance: Big = await this.balances.getBalance(sellAsset);

    const buyAmount = buyBalance
      .div(this.publishFraction)
      .mul(1 + this.rateSpread / 100);

    return {
      protocol: "rfc003",
      timestamp: new Date(),
      buy: {
        asset: buyAsset,
        ledger: buyAsset.ledger,
        quantity: buyAmount
      },
      sell: {
        asset: sellAsset,
        ledger: sellAsset.ledger,
        quantity: sellBalance.div(this.publishFraction)
      }
    };
  }

  /** Returns whether the proposed rate is above the acceptable rate
   *
   * @param {Trade} tradeAmounts The proposed quantities for the trade
   * @return {boolean} True if the trade should proceed (rate and amounts are acceptable), False otherwise
   */
  public async isTradeAcceptable({ buy, sell }: Trade) {
    const buyBalance: Big = await this.balances.getBalance(buy.asset);
    const sellBalance: Big = await this.balances.getBalance(sell.asset);

    const maxSellAmount = sellBalance.div(this.maxFraction);

    if (sell.quantity.gt(maxSellAmount)) {
      return false;
    }

    const sufficientFunds = await this.balances.isSufficientFunds(
      sell.asset,
      sell.quantity
    );
    if (!sufficientFunds) {
      logger.error(
        `Insufficient funds, asset ${
          sell.asset
        } balance is ${this.balances.getBalance(
          sell.asset
        )} but trade requires ${sell.quantity}`
      );
      return false;
    }

    const lowFunds = await this.balances.isLowBalance(sell.asset);
    if (lowFunds) {
      logger.warn(
        `Funds low on asset ${
          sell.asset
        }, only has ${this.balances.getOriginalBalance(
          sell.asset
        )} of balance left`
      );
    }

    const currentBuyRate = buyBalance.div(sellBalance);
    const tradeBuyRate = buy.quantity.div(sell.quantity);

    return tradeBuyRate >= currentBuyRate;
  }

  public async prepareTradesToPublish(): Promise<Trade[]> {
    const trades = new Array<Trade>();

    trades.push(
      await this.prepareTradesToPublishForAsset(Asset.bitcoin, Asset.ether)
    );
    trades.push(
      await this.prepareTradesToPublishForAsset(Asset.ether, Asset.bitcoin)
    );

    return trades;
  }
}
