export interface TradeAmounts {
  buyAsset: string;
  sellAsset: string;
  buyAmount: number; // Always nominal quantity (e.g. Ether for Ethereum)
  sellAmount: number; // Always nominal quantity (e.g. Ether for Ethereum)
}

export interface Balances {
  buyBalance: number;
  sellBalance: number;
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
export class TestnetMarketMaker {
  private readonly rateSpread: number;
  private readonly publishFraction: number;
  // @ts-ignore
  private readonly maxFraction: number;

  /** Initialize the TestnetMarketMaker class.
   *
   * @param {number} rateSpread The percent spread that is used to calculate the published rate from the acceptable rate
   * @param {number} publishFraction Fraction of the sell asset balance that we publish for trades
   * @param {number} maxFraction Max fraction of the sell asset balance we are happy to trade (ie, trading nth of balance means that you can do n trades at the same time)
   * @return {TestnetMarketMaker} The new MarketMaker object
   *
   * Note that {maxFraction} > {publishFraction} must be true or none of the published amounts will be accepted
   */
  constructor(
    rateSpread: number,
    publishFraction: number,
    maxFraction: number
  ) {
    if (maxFraction >= publishFraction) {
      throw new Error(
        "MarketMaker maxFraction has to be be less than publishFraction."
      );
    }

    this.rateSpread = rateSpread;
    this.publishFraction = publishFraction;
    this.maxFraction = maxFraction;
  }

  /** Provide the amounts to publish
   *
   * @param {string} buyAsset The asset to buy
   * @param {string} sellAsset The asset to sell
   * @return {buyAmount: number, sellAmount: number} The buy and sell amounts to publish (in nominal)
   */
  public getAmountsToPublish(
    balances: Balances
  ): { buyAmount: number; sellAmount: number } {
    this.checkSufficientFunds(balances);

    return {
      buyAmount:
        (balances.buyBalance / this.publishFraction) *
        (1 + this.rateSpread / 100),
      sellAmount: balances.sellBalance / this.publishFraction
    };
  }

  /** Returns whether the proposed rate is above the acceptable rate
   *
   * @param {TradeAmounts} tradeAmounts The proposed quantities for the trade
   * @return {boolean} True if the trade should proceed (rate and amounts are acceptable), False otherwise
   */
  public isTradeAcceptable(tradeAmounts: TradeAmounts, balances: Balances) {
    this.checkSufficientFunds(balances);

    const maxSellAmount = balances.sellBalance / this.maxFraction;

    if (tradeAmounts.sellAmount > maxSellAmount) {
      return false;
    }

    const currentBuyRate = balances.buyBalance / balances.sellBalance;
    const tradeBuyRate = tradeAmounts.buyAmount / tradeAmounts.sellAmount;

    return tradeBuyRate >= currentBuyRate;
  }

  private checkSufficientFunds(balances: Balances) {
    if (balances.sellBalance === 0) {
      throw new Error("Insufficient funds");
    }
  }
}
