import Big from "big.js";
import Asset from "../asset";

export interface BalanceLookups {
  [asset: string]: () => Promise<Big>;
}

export default class Balances {
  public static async create(
    balanceLookups: BalanceLookups,
    lowFundsThresholdPercentage: number
  ) {
    const balances = new Balances(lowFundsThresholdPercentage);

    for (const [key, value] of Object.entries(balanceLookups)) {
      const asset = Asset.fromName(key);
      if (!asset) {
        throw new Error(`Asset ${key} not supported`);
      }
      balances.balanceLookup.set(asset, value);
      balances.originalBalance.set(asset, await value());
    }

    return balances;
  }

  private balanceLookup: Map<Asset, () => Promise<Big>>;
  private originalBalance: Map<Asset, Big>;
  private readonly lowFundsThresholdPercentage: Big;

  private constructor(lowFundsThresholdPercentage: number) {
    this.lowFundsThresholdPercentage = new Big(lowFundsThresholdPercentage).div(
      100
    );

    this.balanceLookup = new Map<Asset, () => Promise<Big>>();
    this.originalBalance = new Map<Asset, Big>();
  }

  public getBalance(asset: Asset): Promise<Big> {
    const getBalance = this.balanceLookup.get(asset);

    if (getBalance) {
      return getBalance();
    }

    return Promise.reject(
      `Balance for asset ${asset.name} not initialized correctly`
    );
  }

  public getOriginalBalance(asset: Asset): Big {
    const originalBalance = this.originalBalance.get(asset);

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
