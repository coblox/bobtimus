import BN = require("bn.js");
import { Action, Entity } from "../gen/siren";
import { ActionSelector } from "../src/actionSelector";
import { Config, TomlConfig } from "../src/config";
import swapsAcceptDeclineStub from "./stubs/bitcoinEther/swapsWithAcceptDecline.siren.json";
import swapsRedeemBitcoinEther from "./stubs/bitcoinEther/swapsWithRedeem.siren.json";
import swapsFundEtherBitcoinStub from "./stubs/etherBitcoin/swapsWithFund.siren.json";
import swapsRedeemRefundStub from "./stubs/etherBitcoin/swapsWithRedeemRefund.siren.json";
import swapsRefundStub from "./stubs/etherBitcoin/swapsWithRefund.siren.json";

describe("Action selector tests: ", () => {
  const tomlConfig = {
    comitNodeUrl: "http://localhost:8000",
    seedWords:
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon",
    staticRates: {
      ether: { bitcoin: 0.0105 },
      bitcoin: { ether: 105.26 }
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

  function setupAction(stub: any) {
    const entity = stub.entities[0] as Entity;
    // @ts-ignore
    const actionStub = entity.actions[0] as Action;
    return { entity, actionStub };
  }

  it("Should emit accept only", async done => {
    const actionSelector = new ActionSelector(config);
    const { entity, actionStub } = setupAction(swapsAcceptDeclineStub);

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(actionStub);
    done();
  });

  it("Should emit decline because of wrong rate", async done => {
    tomlConfig.staticRates = {
      ether: { bitcoin: 1 },
      bitcoin: { ether: 1 }
    };
    const config = new Config(tomlConfig as TomlConfig);

    const actionSelector = new ActionSelector(config);

    const entity = swapsAcceptDeclineStub.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();
    // @ts-ignore
    const declinedStub = entity.actions[1] as Action;
    expect(declinedStub.name).toBe("decline");

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(declinedStub);
    done();
  });

  it("Should emit decline because of unexpected pair", async done => {
    const actionSelector = new ActionSelector(config);
    config.bitcoinConfig = undefined;

    const entity = swapsAcceptDeclineStub.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();
    // @ts-ignore
    const declinedStub = entity.actions[1] as Action;
    expect(declinedStub.name).toBe("decline");

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(declinedStub);
    done();
  });

  it("Should emit redeem action", async done => {
    const actionSelector = new ActionSelector(config);
    const { entity, actionStub } = setupAction(swapsRedeemBitcoinEther);

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(actionStub);
    done();
  });

  it("Should emit fund action", async done => {
    const actionSelector = new ActionSelector(config);
    const { entity, actionStub } = setupAction(swapsFundEtherBitcoinStub);

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(actionStub);
    done();
  });

  it("Should not emit fund action twice", async done => {
    const actionSelector = new ActionSelector(config);
    const { entity, actionStub } = setupAction(swapsFundEtherBitcoinStub);

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(actionStub);

    const actionResponse2 = await actionSelector.selectActions(entity);
    expect(actionResponse2).toBeUndefined();
    done();
  });

  it("Should emit refund action", async done => {
    const actionSelector = new ActionSelector(config);
    const { entity, actionStub } = setupAction(swapsRefundStub);

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(actionStub);
    done();
  });

  it("Should emit refund first then redeem action", async done => {
    const actionSelector = new ActionSelector(config);
    const { entity } = setupAction(swapsRedeemRefundStub);

    // @ts-ignore
    const redeemAction = entity.actions.find(
      action => action.name === "redeem"
    ) as Action;
    // @ts-ignore
    const refundAction = entity.actions.find(
      action => action.name === "refund"
    ) as Action;

    const actionResponse1 = await actionSelector.selectActions(entity);
    expect(actionResponse1).toStrictEqual(refundAction);
    const actionResponse2 = await actionSelector.selectActions(entity);
    expect(actionResponse2).toStrictEqual(redeemAction);
    done();
  });
});
