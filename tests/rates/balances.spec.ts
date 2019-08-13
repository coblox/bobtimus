import Big from "big.js";
import Asset from "../../src/asset";
import Balances, { BalanceLookups } from "../../src/rates/balances";

function balance(balance: number) {
  return Promise.resolve(new Big(balance));
}

// Explanation of how these tests work:
// The arrow functions passed to `Balances.create` close over the local variables `bitcoinBalance` and `etherBalance` and
// thus allow us to _change_ the balance after `Balances` has been constructed because the closure will be re-evaluated
// on every call to `Balances.getBalance`
describe("Balances tests", () => {
  const lowFundsThresholdPercentage = 20;

  it("Should return the changed balance after the balance changed", async () => {
    let bitcoinBalance = 1;
    let etherBalance = 2;

    const balanceLookups = new BalanceLookups([
      [Asset.bitcoin.toMapKey(), () => balance(bitcoinBalance)],
      [Asset.ether.toMapKey(), () => balance(etherBalance)]
    ]);
    const balances = await Balances.new(
      lowFundsThresholdPercentage,
      balanceLookups
    );

    expect(await balances.getBalance(Asset.bitcoin)).toEqual(new Big(1));
    expect(await balances.getBalance(Asset.ether)).toEqual(new Big(2));

    bitcoinBalance = 0;
    etherBalance = 0;

    expect(await balances.getBalance(Asset.bitcoin)).toEqual(new Big(0));
    expect(await balances.getBalance(Asset.ether)).toEqual(new Big(0));
  });

  it("Should return the original balance after the balance changed", async () => {
    let bitcoinBalance = 1;
    let etherBalance = 2;

    const balanceLookups = new BalanceLookups([
      [Asset.bitcoin.toMapKey(), () => balance(bitcoinBalance)],
      [Asset.ether.toMapKey(), () => balance(etherBalance)]
    ]);
    const balances = await Balances.new(
      lowFundsThresholdPercentage,
      balanceLookups
    );

    expect(await balances.getOriginalBalance(Asset.bitcoin)).toEqual(
      new Big(1)
    );
    expect(await balances.getOriginalBalance(Asset.ether)).toEqual(new Big(2));

    bitcoinBalance = 0;
    etherBalance = 0;

    expect(await balances.getOriginalBalance(Asset.bitcoin)).toEqual(
      new Big(1)
    );
    expect(await balances.getOriginalBalance(Asset.ether)).toEqual(new Big(2));
  });

  it("Should return insufficient funds if funds are 0", async () => {
    const balanceLookups = new BalanceLookups([
      [Asset.bitcoin.toMapKey(), () => balance(0)],
      [Asset.ether.toMapKey(), () => balance(0)]
    ]);
    const balances = await Balances.new(
      lowFundsThresholdPercentage,
      balanceLookups
    );

    expect(await balances.isSufficientFunds(Asset.bitcoin)).toBeFalsy();
  });

  it("Should return insufficient funds if balance minus trade amount is equal or below 0", async () => {
    const balanceLookups = new BalanceLookups([
      [Asset.bitcoin.toMapKey(), () => balance(1)],
      [Asset.ether.toMapKey(), () => balance(0)]
    ]);
    const balances = await Balances.new(
      lowFundsThresholdPercentage,
      balanceLookups
    );

    expect(
      await balances.isSufficientFunds(Asset.bitcoin, new Big(1.0001))
    ).toBeFalsy();
  });

  it("Should return low funds if balance is below the threshold", async () => {
    let bitcoinBalance = 10;
    const balanceLookups = new BalanceLookups([
      [Asset.bitcoin.toMapKey(), () => balance(bitcoinBalance)],
      [Asset.ether.toMapKey(), () => balance(0)]
    ]);
    const balances = await Balances.new(
      lowFundsThresholdPercentage,
      balanceLookups
    );

    bitcoinBalance = 1;
    expect(await balances.isLowBalance(Asset.bitcoin)).toBeTruthy();

    bitcoinBalance = 2;
    expect(await balances.isLowBalance(Asset.bitcoin)).toBeTruthy();
  });

  it("Should not return low funds if balance is over the threshold", async () => {
    let bitcoinBalance = 10;

    const balanceLookups = new BalanceLookups([
      [Asset.bitcoin.toMapKey(), () => balance(bitcoinBalance)],
      [Asset.ether.toMapKey(), () => balance(0)]
    ]);
    const balances = await Balances.new(
      lowFundsThresholdPercentage,
      balanceLookups
    );
    bitcoinBalance = 2.1;

    expect(await balances.isLowBalance(Asset.bitcoin)).toBeFalsy();
  });
});
