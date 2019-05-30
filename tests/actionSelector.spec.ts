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

  it("Should emit accept only", async done => {
    const actionSelector = new ActionSelector(config);

    const entity = swapsAcceptDeclineStub.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();
    // @ts-ignore
    const acceptedStub = entity.actions[0] as Action;
    expect(acceptedStub.name).toBe("accept");

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse[0]).toStrictEqual(acceptedStub);
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
    expect(actionResponse[0]).toStrictEqual(declinedStub);
    done();
  });

  it("Should emit error because of unexpected pair", async done => {
    config.bitcoinConfig = undefined;
    const actionSelector = new ActionSelector(config);

    const entity = swapsAcceptDeclineStub.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();

    // @ts-ignore
    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse.length).toBe(0);
    done();
  });

  it("Should emit redeem action", async done => {
    const actionSelector = new ActionSelector(config);

    const entity = swapsRedeemBitcoinEther.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();
    // @ts-ignore
    const action = entity.actions[0] as Action;
    expect(action.name).toBe("redeem");

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse[0]).toStrictEqual(action);
    done();
  });

  it("Should emit fund action", async done => {
    const actionSelector = new ActionSelector(config);

    const entity = swapsFundEtherBitcoinStub.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();
    // @ts-ignore
    const action = entity.actions[0] as Action;
    expect(action.name).toBe("fund");

    const actionResponse = await actionSelector.selectActions(entity);

    expect(actionResponse[0]).toStrictEqual(action);
    done();
  });
});
