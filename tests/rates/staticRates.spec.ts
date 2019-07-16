import Big from "big.js";
import { List } from "underscore";
import Asset from "../../src/asset";
import Ledger from "../../src/ledger";
import StaticRates from "../../src/rates/staticRates";
import { TradeAmountPair } from "../../src/rates/tradeService";

describe("Rate tests", () => {
  it("Should consider the rate profitable when the proposed rate is less than the configured rate", async () => {
    const config = {
      ether: { bitcoin: 0.001 },
      bitcoin: { ether: 0.01 }
    };

    const tradeAmountPair = {
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.Bitcoin,
        quantity: new Big(0.1)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.Ether,
        quantity: new Big(0.0009)
      }
    };

    const rates = new StaticRates(config);
    expect(await rates.isTradeAcceptable(tradeAmountPair)).toBeTruthy();
  });

  it("Should consider the rate NOT profitable when the proposed rate is greater than the configured rate", async () => {
    const config = {
      ether: { bitcoin: 0.001 },
      bitcoin: { ether: 0.01 }
    };

    const tradeAmountPair = {
      buy: {
        ledger: Ledger.Bitcoin,
        asset: Asset.Bitcoin,
        quantity: new Big(0.1)
      },
      sell: {
        ledger: Ledger.Ethereum,
        asset: Asset.Ether,
        quantity: new Big(0.0011)
      }
    };

    const rates = new StaticRates(config);
    expect(await rates.isTradeAcceptable(tradeAmountPair)).toBeFalsy();
  });

  it("Should return the amounts for configured rates", async () => {
    const tradeAmountPairs: List<TradeAmountPair> = [
      {
        buy: {
          ledger: Ledger.Bitcoin,
          asset: Asset.Bitcoin,
          quantity: new Big(1)
        },
        sell: {
          ledger: Ledger.Ethereum,
          asset: Asset.Ether,
          quantity: new Big(100)
        }
      },
      {
        buy: {
          ledger: Ledger.Ethereum,
          asset: Asset.Ether,
          quantity: new Big(1)
        },
        sell: {
          ledger: Ledger.Bitcoin,
          asset: Asset.Bitcoin,
          quantity: new Big(0.01)
        }
      }
    ];

    const config = {
      ether: { bitcoin: 0.01 },
      bitcoin: { ether: 100 }
    };

    const rates = new StaticRates(config);
    const amounts = await rates.calculateAmountsToPublish();

    expect(amounts[0].buy).toEqual(tradeAmountPairs[0].buy);
    expect(amounts[1].sell).toEqual(tradeAmountPairs[1].sell);
  });
});
