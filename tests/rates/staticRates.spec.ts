import Big from "big.js";
import { List } from "underscore";
import Asset from "../../src/asset";
import Ledger from "../../src/ledger";
import StaticRates from "../../src/rates/staticRates";
import { Offer } from "../../src/rates/tradeService";

describe("Rate tests", () => {
  it("Should consider the rate profitable when the proposed rate is less than the configured rate", async () => {
    const config = {
      ether: { bitcoin: 0.001 },
      bitcoin: { ether: 0.01 }
    };

    const trade = {
      timestamp: new Date(),
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.bitcoin,
        quantity: new Big(0.1)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.ether,
        quantity: new Big(0.0009)
      },
      protocol: "rfc003"
    };

    const rates = new StaticRates(config);
    expect(await rates.isOfferAcceptable(trade)).toBeTruthy();
  });

  it("Should consider the rate NOT profitable when the proposed rate is greater than the configured rate", async () => {
    const config = {
      ether: { bitcoin: 0.001 },
      bitcoin: { ether: 0.01 }
    };

    const trade = {
      timestamp: new Date(),
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.bitcoin,
        quantity: new Big(0.1)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.ether,
        quantity: new Big(0.0011)
      },
      protocol: "rfc003"
    };

    const rates = new StaticRates(config);
    expect(await rates.isOfferAcceptable(trade)).toBeFalsy();
  });

  it("Should return the amounts for configured rates", async () => {
    const trades: List<Offer> = [
      {
        timestamp: new Date(),
        protocol: "rfc003",
        buy: {
          ledger: Ledger.Bitcoin,
          asset: Asset.bitcoin,
          quantity: new Big(1)
        },
        sell: {
          ledger: Ledger.Ethereum,
          asset: Asset.ether,
          quantity: new Big(100)
        }
      },
      {
        timestamp: new Date(),
        protocol: "rfc003",
        buy: {
          ledger: Ledger.Ethereum,
          asset: Asset.ether,
          quantity: new Big(1)
        },
        sell: {
          ledger: Ledger.Bitcoin,
          asset: Asset.bitcoin,
          quantity: new Big(0.01)
        }
      }
    ];

    const config = {
      ether: { bitcoin: 0.01 },
      bitcoin: { ether: 100 }
    };

    const rates = new StaticRates(config);
    const amounts = await rates.prepareOffersToPublish();

    expect(amounts[0].buy).toEqual(trades[0].buy);
    expect(amounts[1].sell).toEqual(trades[1].sell);
  });

  const payAsset = new Asset("PAY", Ledger.Ethereum, {
    address: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
    decimals: 18
  });

  it("Should consider the rate profitable when the proposed rate is less than the configured rate and one asset is ERC20", async () => {
    const config = {
      PAY: { bitcoin: 0.001 },
      bitcoin: { PAY: 0.01 }
    };

    const trade = {
      timestamp: new Date(),
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.bitcoin,
        quantity: new Big(0.1)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: payAsset,
        quantity: new Big(0.0009)
      },
      protocol: "rfc003"
    };

    const rates = new StaticRates(config);
    expect(await rates.isOfferAcceptable(trade)).toBeTruthy();
  });

  it("Should consider the rate NOT profitable when the proposed rate is greater than the configured rate and one asset is ERC20", async () => {
    const config = {
      PAY: { bitcoin: 0.001 },
      bitcoin: { PAY: 0.01 }
    };

    const trade = {
      timestamp: new Date(),
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.bitcoin,
        quantity: new Big(0.1)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: payAsset,
        quantity: new Big(0.0011)
      },
      protocol: "rfc003"
    };

    const rates = new StaticRates(config);
    expect(await rates.isOfferAcceptable(trade)).toBeFalsy();
  });

  it("Should not consider the rate profitable when one asset is not configured", async () => {
    const config = {
      PAY: { bitcoin: 0.001 },
      bitcoin: { PAY: 0.01 }
    };

    const tenxAsset = new Asset("TENX", Ledger.Ethereum, {
      address: "0x515bA0a2E286AF10115284F151cF398688A69170",
      decimals: 18
    });

    const trade = {
      timestamp: new Date(),
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.bitcoin,
        quantity: new Big(0.1)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: tenxAsset,
        quantity: new Big(0.0009)
      },
      protocol: "rfc003"
    };

    const rates = new StaticRates(config);
    expect(await rates.isOfferAcceptable(trade)).toBeFalsy();
  });
});
