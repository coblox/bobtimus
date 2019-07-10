import Big from "big.js";
import { getLogger } from "log4js";
import Asset from "../asset";
import { TradeAmounts, TradeEvaluationService } from "./tradeEvaluationService";

const logger = getLogger();

export type BalanceLookups = {
  [asset in Asset]: () => Promise<Big>; // Always nominal quantity
};

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
export default class TestnetMarketMaker implements TradeEvaluationService {
  public static async create(
    testnetMarketMakerConfig: TestnetMarketMakerConfig,
    balanceLookups: BalanceLookups
  ) {
    const bitcoinStartupBalance = await balanceLookups.bitcoin();
    const ethereumStartupBalance = await balanceLookups.ether();

    const startupBalances = new Map();
    startupBalances.set(Asset.Bitcoin, bitcoinStartupBalance);
    startupBalances.set(Asset.Ether, ethereumStartupBalance);

    return new TestnetMarketMaker(
      testnetMarketMakerConfig,
      balanceLookups,
      startupBalances
    );
  }

  private readonly rateSpread: number;
  private readonly publishFraction: number;
  private readonly maxFraction: number;
  private readonly balanceLookups: BalanceLookups;
  private readonly startupBalances: Map<Asset, Big>;

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
  private constructor(
    { rateSpread, publishFraction, maxFraction }: TestnetMarketMakerConfig,
    balanceLookups: BalanceLookups,
    startupBalances: Map<Asset, Big>
  ) {
    if (maxFraction >= publishFraction) {
      throw new Error(
        "MarketMaker maxFraction has to be be less than publishFraction."
      );
    }

    this.rateSpread = rateSpread;
    this.publishFraction = publishFraction;
    this.maxFraction = maxFraction;
    this.balanceLookups = balanceLookups;
    this.startupBalances = startupBalances;
  }

  /** Provide the amounts to publish
   *
   * @param {string} buyAsset The asset to buy
   * @param {string} sellAsset The asset to sell
   * @return {buyNominalAmount: number, sellNominalAmount: number} The buy and sell amounts to publish (in nominal)
   */
  public async calculateAmountsToPublish(
    buyAsset: Asset,
    sellAsset: Asset
  ): Promise<{ buyNominalAmount: Big; sellNominalAmount: Big }> {
    const sufficientFunds = await this.checkSufficientFunds(sellAsset);
    if (!sufficientFunds) {
      throw new Error(
        `Insufficient funding of asset ${sellAsset} to publish amounts`
      );
    }

    const buyBalance = await this.balanceLookups[buyAsset]();
    const sellBalance = await this.balanceLookups[sellAsset]();

    const buyAmount = buyBalance
      .div(this.publishFraction)
      .mul(1 + this.rateSpread / 100);

    return {
      buyNominalAmount: buyAmount,
      sellNominalAmount: sellBalance.div(this.publishFraction)
    };
  }

  /** Returns whether the proposed rate is above the acceptable rate
   *
   * @param {TradeAmounts} tradeAmounts The proposed quantities for the trade
   * @return {boolean} True if the trade should proceed (rate and amounts are acceptable), False otherwise
   */
  public async isTradeAcceptable({
    sellAsset,
    sellNominalAmount,
    buyAsset,
    buyNominalAmount
  }: TradeAmounts) {
    const buyBalance = await this.balanceLookups[buyAsset]();
    const sellBalance = await this.balanceLookups[sellAsset]();

    const maxSellAmount = sellBalance.div(this.maxFraction);

    if (sellNominalAmount.gt(maxSellAmount)) {
      return false;
    }

    await this.checkSufficientFunds(sellAsset, sellNominalAmount);

    const currentBuyRate = buyBalance.div(sellBalance);
    const tradeBuyRate = buyNominalAmount.div(sellNominalAmount);

    return tradeBuyRate >= currentBuyRate;
  }

  private async checkSufficientFunds(asset: Asset, nominalAmount?: Big) {
    const balance = await this.balanceLookups[asset]();

    if (balance.eq(0)) {
      logger.error(`Insufficient funds, asset ${asset} balance is 0`);
      return false;
    }

    if (nominalAmount) {
      const balanceSufficientForAmount = balance.sub(nominalAmount);
      if (balanceSufficientForAmount.lte(0)) {
        logger.error(
          `Insufficient funds, asset ${asset} balance is ${balance} but trade requires ${nominalAmount}`
        );
        return false;
      }
    }

    this.lowBalanceWarning(balance, asset, new Big(0.2));

    return true;
  }

  private lowBalanceWarning(
    balance: Big,
    asset: Asset,
    thresholdPercentage: Big
  ) {
    const initialBalance = this.startupBalances.get(asset);
    if (!initialBalance) {
      throw new Error(`Balance of ${asset} not initialized correctly`);
    }

    const percentageOfBalanceLeft = balance.div(initialBalance);

    if (percentageOfBalanceLeft.lte(thresholdPercentage)) {
      logger.warn(
        `Funds low on asset ${asset}, only has ${percentageOfBalanceLeft.mul(
          100
        )}% of balance left`
      );
    }
  }
}
