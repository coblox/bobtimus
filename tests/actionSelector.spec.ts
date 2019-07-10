import BN = require("bn.js");
import { Entity } from "../gen/siren";
import { ActionSelector } from "../src/actionSelector";
import { Config, TomlConfig } from "../src/config";
import StaticRates, { ConfigRates } from "../src/rates/staticRates";
import swapsAcceptDeclineStub from "./stubs/bitcoinEther/swapsWithAcceptDecline.siren.json";
import swapsRedeemBitcoinEther from "./stubs/bitcoinEther/swapsWithRedeem.siren.json";
import swapsFundEtherBitcoinStub from "./stubs/etherBitcoin/swapsWithFund.siren.json";
import swapsRedeemRefundStub from "./stubs/etherBitcoin/swapsWithRedeemRefund.siren.json";
import swapsRefundStub from "./stubs/etherBitcoin/swapsWithRefund.siren.json";

function extractEntityAndAction(json: any, actionName: string) {
  const entity = json.entities[0] as Entity | undefined;

  if (!entity) {
    throw new Error(`Entity could not be extracted from test data`);
  }

  if (!entity.actions) {
    throw new Error(`Entity did not contain any actions`);
  }

  const action = entity.actions.find(element => element.name === actionName);

  if (!action) {
    throw new Error(`Entity did not contain action with name ${actionName}`);
  }

  return { entity, action };
}

describe("Action selector tests: ", () => {
  const tomlConfig = {
    comitNodeUrl: "http://localhost:8000",
    seedWords:
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon",
    rates: {
      static: {
        ether: { bitcoin: 0.0105 },
        bitcoin: { ether: 105.26 }
      }
    },
    ledgers: {
      bitcoin: {
        type: "coreRpc",
        rpcUsername: "bitcoin",
        rpcPassword: "password",
        rpcHost: "127.0.0.1",
        rpcPort: 18443,
        network: "regtest",
        fee: {
          defaultFee: 10,
          strategy: "hourFee"
        }
      },
      ethereum: {
        web3Endpoint: "http://localhost:8545",
        fee: {
          defaultFee: new BN(10),
          strategy: "average"
        }
      }
    }
  };
  const config = new Config(tomlConfig as TomlConfig);
  const rates = new StaticRates(tomlConfig.rates.static as ConfigRates);

  it("Should emit accept only", async done => {
    const actionSelector = new ActionSelector(config, rates);
    const { entity, action } = extractEntityAndAction(
      swapsAcceptDeclineStub,
      "accept"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });

  it("Should emit decline because of wrong rate", async done => {
    const rates = new StaticRates({
      ether: { bitcoin: 1 },
      bitcoin: { ether: 1 } // This one is tested
    });

    const actionSelector = new ActionSelector(config, rates);
    const { entity, action } = extractEntityAndAction(
      swapsAcceptDeclineStub,
      "decline"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });

  it("Should emit decline because of unexpected pair", async done => {
    const actionSelector = new ActionSelector(config, rates);
    config.bitcoinConfig = undefined;
    const { entity, action } = extractEntityAndAction(
      swapsAcceptDeclineStub,
      "decline"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });

  it("Should emit redeem action", async done => {
    const actionSelector = new ActionSelector(config, rates);
    const { entity, action } = extractEntityAndAction(
      swapsRedeemBitcoinEther,
      "redeem"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });

  it("Should emit fund action", async done => {
    const actionSelector = new ActionSelector(config, rates);
    const { entity, action } = extractEntityAndAction(
      swapsFundEtherBitcoinStub,
      "fund"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });

  it("Should not emit fund action twice", async done => {
    const actionSelector = new ActionSelector(config, rates);
    const { entity, action } = extractEntityAndAction(
      swapsFundEtherBitcoinStub,
      "fund"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);

    const actionResponse2 = await actionSelector.selectActions(entity);
    expect(actionResponse2).toBeUndefined();
    done();
  });

  it("Should emit refund action", async done => {
    const actionSelector = new ActionSelector(config, rates);
    const { entity, action } = extractEntityAndAction(
      swapsRefundStub,
      "refund"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });

  it("Should emit refund first then redeem action", async done => {
    const actionSelector = new ActionSelector(config, rates);

    {
      const { entity, action } = extractEntityAndAction(
        swapsRedeemRefundStub,
        "refund"
      );

      const actionResponse = await actionSelector.selectActions(entity);

      expect(actionResponse).toStrictEqual(action);
    }

    {
      const { entity, action } = extractEntityAndAction(
        swapsRedeemRefundStub,
        "redeem"
      );

      const actionResponse = await actionSelector.selectActions(entity);

      expect(actionResponse).toStrictEqual(action);
    }

    done();
  });
});
