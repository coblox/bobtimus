import Big from "big.js";
import Asset from "../asset";

export type BalanceLookups = Map<Asset, () => Promise<Big>>;

export default class Balances {
  public static async create(
    balanceLookups: BalanceLookups,
    lowFundsThresholdPercentage: number
  ): Promise<Balances> {
    const balances = new Balances(lowFundsThresholdPercentage);

    const promises: Array<Promise<void>> = [];
    balanceLookups.forEach((value: () => Promise<Big>, asset: Asset) => {
      promises.push(
        (async (value, asset) => {
          if (!asset) {
            throw new Error(`Asset ${asset} not supported`);
          }
          balances.balanceLookup.set(asset.toMapKey(), value);
          const originalBalance = await value();
          balances.originalBalance.set(asset.toMapKey(), originalBalance);
        })(value, asset)
      );
    });

    await Promise.all(promises);
    return balances;
  }

  private balanceLookup: Map<string, () => Promise<Big>>;
  private originalBalance: Map<string, Big>;
  private readonly lowFundsThresholdPercentage: Big;

  private constructor(lowFundsThresholdPercentage: number) {
    this.lowFundsThresholdPercentage = new Big(lowFundsThresholdPercentage).div(
      100
    );

    this.balanceLookup = new Map<string, () => Promise<Big>>();
    this.originalBalance = new Map<string, Big>();
  }

  public getBalance(asset: Asset): Promise<Big> {
    const getBalance = this.balanceLookup.get(asset.toMapKey());

    if (getBalance) {
      return getBalance();
    }

    return Promise.reject(
      `Balance for asset ${asset.name} not initialized correctly`
    );
  }

  public getOriginalBalance(asset: Asset): Big {
    const originalBalance = this.originalBalance.get(asset.toMapKey());

    if (!originalBalance) {
      throw new Error(
        `Original balance for asset ${asset} not initialized correctly`
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
