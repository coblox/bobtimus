import Big from "big.js";
import Asset from "../../src/asset";
import Balances, { BalanceLookups } from "../../src/rates/balances";

describe("Balances tests", () => {
  let bitcoinBalance = -1;
  let ethereumBalance = -1;

  let balances: Balances;
  const lowFundsThresholdPercentage = 20;

  async function createMockBalances() {
    const mockBalanceLookups: BalanceLookups = {
      bitcoin: () => Promise.resolve(new Big(bitcoinBalance)),
      ether: () => Promise.resolve(new Big(ethereumBalance))
    };
    balances = await Balances.create(
      mockBalanceLookups,
      lowFundsThresholdPercentage
    );
  }

  it("Should return the changed balance after the balance changed", async () => {
    bitcoinBalance = 1;
    ethereumBalance = 2;
    await createMockBalances();

    expect(await balances.getBalance(Asset.Bitcoin)).toEqual(new Big(1));
    expect(await balances.getBalance(Asset.Ether)).toEqual(new Big(2));

    bitcoinBalance = 0;
    ethereumBalance = 0;

    expect(await balances.getBalance(Asset.Bitcoin)).toEqual(new Big(0));
    expect(await balances.getBalance(Asset.Ether)).toEqual(new Big(0));
  });

  it("Should return the original balance after the balance changed", async () => {
    bitcoinBalance = 1;
    ethereumBalance = 2;
    await createMockBalances();

    expect(await balances.getOriginalBalance(Asset.Bitcoin)).toEqual(
      new Big(1)
    );
    expect(await balances.getOriginalBalance(Asset.Ether)).toEqual(new Big(2));

    bitcoinBalance = 0;
    ethereumBalance = 0;

    expect(await balances.getOriginalBalance(Asset.Bitcoin)).toEqual(
      new Big(1)
    );
    expect(await balances.getOriginalBalance(Asset.Ether)).toEqual(new Big(2));
  });

  it("Should return insufficient funds if funds are 0", async () => {
    bitcoinBalance = 0;
    await createMockBalances();

    expect(await balances.isSufficientFunds(Asset.Bitcoin)).toBeFalsy();
  });

  it("Should return insufficient funds if balance minus trade amount is equal or below 0", async () => {
    bitcoinBalance = 1;
    await createMockBalances();

    expect(
      await balances.isSufficientFunds(Asset.Bitcoin, new Big(1.0001))
    ).toBeFalsy();
  });

  it("Should return low funds if balance is below the threshold", async () => {
    bitcoinBalance = 10;
    await createMockBalances();
    bitcoinBalance = 1;
    expect(await balances.isLowBalance(Asset.Bitcoin)).toBeTruthy();
    bitcoinBalance = 2;
    expect(await balances.isLowBalance(Asset.Bitcoin)).toBeTruthy();
  });

  it("Should not return low funds if balance is over the threshold", async () => {
    bitcoinBalance = 10;
    await createMockBalances();
    bitcoinBalance = 2.1;

    expect(await balances.isLowBalance(Asset.Bitcoin)).toBeFalsy();
  });
});
