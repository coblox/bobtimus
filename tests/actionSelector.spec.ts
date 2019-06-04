import BN = require("bn.js");
import { Action, Entity } from "../gen/siren";
import { ActionSelector } from "../src/actionSelector";
import { Config } from "../src/config";
import swapsAcceptDeclineStub from "./stubs/bitcoinEther/swapsWithAcceptDecline.siren.json";
import swapsRedeemBitcoinEther from "./stubs/bitcoinEther/swapsWithRedeem.siren.json";
import swapsFundEtherBitcoinStub from "./stubs/etherBitcoin/swapsWithFund.siren.json";

describe("Action selector tests: ", () => {
  const config = new Config({
    comitNodeUrl: "http://localhost:8000",
    seedWords:
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon",
    rates: { ether: { bitcoin: { sell: 0.0105, buy: 0.0105 } } },
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
  });

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
    config.rates = { ether: { bitcoin: { sell: 1, buy: 1 } } };
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

  it("Should emit error because of unexpected pair", async done => {
    const actionSelector = new ActionSelector(config);
    config.bitcoinConfig = undefined;
    const { entity } = setupAction(swapsAcceptDeclineStub);

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toBeUndefined();
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
});
