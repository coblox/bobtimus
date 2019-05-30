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

  it("Should emit accept only", done => {
    const actionSelector = new ActionSelector(config);

    let success = false;

    const entity = swapsAcceptDeclineStub.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();
    // @ts-ignore
    const acceptedStub = entity.actions[0] as Action;
    expect(acceptedStub.name).toBe("accept");
    actionSelector.selectActions(entity).subscribe(
      actionResponse => {
        success = true;
        expect(actionResponse).toStrictEqual(acceptedStub);
      },
      error => {
        fail(error);
      },
      () => {
        expect(success).toBeTruthy();
        done();
      }
    );
  });

  it("Should emit decline because of wrong rate", done => {
    config.rates = { ether: { bitcoin: { sell: 1, buy: 1 } } };
    const actionSelector = new ActionSelector(config);

    let success = false;

    const entity = swapsAcceptDeclineStub.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();
    // @ts-ignore
    const declinedStub = entity.actions[1] as Action;
    expect(declinedStub.name).toBe("decline");
    actionSelector.selectActions(entity).subscribe(
      actionResponse => {
        success = true;
        expect(actionResponse).toStrictEqual(declinedStub);
      },
      error => {
        fail(error);
      },
      () => {
        expect(success).toBeTruthy();
        done();
      }
    );
  });

  it("Should emit error because of unexpected pair", done => {
    config.bitcoinConfig = undefined;
    const actionSelector = new ActionSelector(config);

    let failed = false;

    const entity = swapsAcceptDeclineStub.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();
    // @ts-ignore
    actionSelector.selectActions(entity).subscribe(
      actionResponse => {
        fail(actionResponse);
      },
      error => {
        failed = true;
        expect(error).toStrictEqual(
          "Ledger-Asset not supported (bitcoin:bitcoin/ethereum:ether)"
        );
        done();
      },
      () => {
        expect(failed).toBeTruthy();
        done();
      }
    );
  });

  it("Should emit redeem action", done => {
    const actionSelector = new ActionSelector(config);

    let success = false;

    const entity = swapsRedeemBitcoinEther.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();
    // @ts-ignore
    const action = entity.actions[0] as Action;
    expect(action.name).toBe("redeem");
    actionSelector.selectActions(entity).subscribe(
      actionResponse => {
        success = true;
        expect(actionResponse).toStrictEqual(action);
      },
      error => {
        fail(error);
      },
      () => {
        expect(success).toBeTruthy();
        done();
      }
    );
  });

  it("Should emit fund action", done => {
    const actionSelector = new ActionSelector(config);

    let success = false;

    const entity = swapsFundEtherBitcoinStub.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();
    // @ts-ignore
    const action = entity.actions[0] as Action;
    expect(action.name).toBe("fund");
    actionSelector.selectActions(entity).subscribe(
      actionResponse => {
        success = true;
        expect(actionResponse).toStrictEqual(action);
      },
      error => {
        fail(error);
      },
      () => {
        expect(success).toBeTruthy();
        done();
      }
    );
  });
});
