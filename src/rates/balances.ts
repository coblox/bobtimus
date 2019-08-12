import Big from "big.js";
import Asset from "../asset";

type BalanceFunction = () => Promise<Big>;

export class BalanceLookups {
  private inner: Map<string, BalanceFunction>;

  constructor(
    entries?: ReadonlyArray<readonly [string, BalanceFunction]> | null
  ) {
    this.inner = new Map(entries);
  }

  public get(asset: Asset) {
    return this.inner.get(asset.toMapKey());
  }

  public async getBalances(): Promise<Map<string, Big>> {
    const balancesPromises = this.map(
      async ([strAsset, getBalance]): Promise<[string, Big]> => {
        const balance: Big = await getBalance();
        return [strAsset, balance];
      }
    );

    const balances: Array<[string, Big]> = await Promise.all(balancesPromises);

    return Promise.resolve(new Map(balances));
  }

  private map<U>(
    callback: (value: [string, BalanceFunction], index: number) => U
  ): U[] {
    const inner = Array.from(this.inner.entries());
    return inner.map(callback);
  }
}

export default class Balances {
  public static async new(
    lowFundsThresholdPercentage: number,
    balanceLookups: BalanceLookups
  ): Promise<Balances> {
    const originalBalances = await balanceLookups.getBalances();

    return new Balances(
      balanceLookups,
      originalBalances,
      new Big(lowFundsThresholdPercentage).div(100)
    );
  }
  private balanceLookups: BalanceLookups;
  private originalBalances: Map<string, Big>;
  private readonly lowFundsThresholdPercentage: Big;

  private constructor(
    balanceLookups: BalanceLookups,
    originalBalances: Map<string, Big>,
    lowFundsTresholdPercentage: Big
  ) {
    this.balanceLookups = balanceLookups;
    this.originalBalances = originalBalances;
    this.lowFundsThresholdPercentage = lowFundsTresholdPercentage;
  }

  public getBalance(asset: Asset): Promise<Big> {
    const getBalance = this.balanceLookups.get(asset);

    if (getBalance) {
      return getBalance();
    }

    return Promise.reject(
      `Balance for asset ${asset.name} not initialized correctly`
    );
  }

  public getOriginalBalance(asset: Asset): Big {
    const originalBalance = this.originalBalances.get(asset.toMapKey());

    if (!originalBalance) {
      throw new Error(
        `Original balance not initialized correctly for ${JSON.stringify(
          asset
        )}`
      );
    }

    return originalBalance;
  }

  public async isSufficientFunds(
    asset: Asset,
    nominalAmount?: Big
  ): Promise<boolean> {
    const balance = await this.getBalance(asset);

    if (balance.eq(0)) {
      return false;
    }

    if (nominalAmount) {
      const balanceSufficientForAmount = balance.sub(nominalAmount);
      if (balanceSufficientForAmount.lte(0)) {
        return false;
      }
    }

    return true;
  }

  public async isLowBalance(asset: Asset): Promise<boolean> {
    const balance = await this.getBalance(asset);
    const originalBalance = this.getOriginalBalance(asset);

    const percentageOfBalanceLeft = balance.div(originalBalance);

    return percentageOfBalanceLeft.lte(this.lowFundsThresholdPercentage);
  }
}
