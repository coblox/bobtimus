import BN = require("bn.js");
import { Action, Entity } from "../gen/siren";
import { ActionSelector } from "../src/actionSelector";
import { Config } from "../src/config";
import swapsAcceptDeclineStub from "./stubs/bitcoinEther/swapsWithAcceptDecline.siren.json";
import swapsRedeemBitcoinEther from "./stubs/bitcoinEther/swapsWithRedeem.siren.json";
import swapsFundEtherBitcoinStub from "./stubs/etherBitcoin/swapsWithFund.siren.json";

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

describe("Action selector tests: ", () => {
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

describe("Action selector rate tests", () => {
  it("Should accept because Bob sells Ether and request is above the sell rate", async done => {
    config.rates = { ether: { bitcoin: { sell: 0.001, buy: 0.01 } } };
    const actionSelector = new ActionSelector(config);

    const entity = swapsAcceptDeclineStub.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();

    entity.properties = {
      parameters: {
        alpha_asset: {
          name: "bitcoin",
          quantity: "200000" // 0.002 Bitcoin
        },
        alpha_ledger: {
          name: "bitcoin",
          network: "regtest"
        },
        beta_asset: {
          name: "ether",
          quantity: "1000000000000000000" // 1 Ether
        },
        beta_ledger: {
          name: "ethereum",
          network: "regtest"
        }
      }
    };

    // @ts-ignore
    const acceptStub = entity.actions[0] as Action;
    expect(acceptStub.name).toBe("accept");

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(acceptStub);
    done();
  });

  it("Should decline because Bob sells Ether and request is below the sell rate", async done => {
    config.rates = { ether: { bitcoin: { sell: 0.001, buy: 0.01 } } };
    const actionSelector = new ActionSelector(config);

    const entity = swapsAcceptDeclineStub.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();

    entity.properties = {
      parameters: {
        alpha_asset: {
          name: "bitcoin",
          quantity: "80000" // 0.0008 Bitcoin
        },
        alpha_ledger: {
          name: "bitcoin",
          network: "regtest"
        },
        beta_asset: {
          name: "ether",
          quantity: "1000000000000000000" // 1 Ether
        },
        beta_ledger: {
          name: "ethereum",
          network: "regtest"
        }
      }
    };

    // @ts-ignore
    const declineStub = entity.actions[1] as Action;
    expect(declineStub.name).toBe("decline");

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(declineStub);
    done();
  });

  it("Should accept because Bob buys Ether and request is above the sell rate", async done => {
    config.rates = { ether: { bitcoin: { sell: 0.001, buy: 0.01 } } };
    const actionSelector = new ActionSelector(config);

    const entity = swapsAcceptDeclineStub.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();

    entity.properties = {
      parameters: {
        alpha_asset: {
          name: "ether",
          quantity: "1000000000000000000" // 1 Ether
        },
        alpha_ledger: {
          name: "ethereum",
          network: "regtest"
        },
        beta_asset: {
          name: "bitcoin",
          quantity: "900000" // 0.009 Bitcoin
        },
        beta_ledger: {
          name: "bitcoin",
          network: "regtest"
        }
      }
    };

    // @ts-ignore
    const acceptStub = entity.actions[0] as Action;
    expect(acceptStub.name).toBe("accept");

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(acceptStub);
    done();
  });

  it("Should decline because Bob buys Ether and request is below the sell rate", async done => {
    config.rates = { ether: { bitcoin: { sell: 0.001, buy: 0.01 } } };
    const actionSelector = new ActionSelector(config);

    const entity = swapsAcceptDeclineStub.entities[0] as Entity;
    expect(entity.actions).not.toBeUndefined();

    entity.properties = {
      parameters: {
        alpha_asset: {
          name: "ether",
          quantity: "1000000000000000000" // 1 Ether
        },
        alpha_ledger: {
          name: "ethereum",
          network: "regtest"
        },
        beta_asset: {
          name: "bitcoin",
          quantity: "2000000" // 0.02 Bitcoin
        },
        beta_ledger: {
          name: "bitcoin",
          network: "regtest"
        }
      }
    };

    // @ts-ignore
    const declineStub = entity.actions[1] as Action;
    expect(declineStub.name).toBe("decline");

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(declineStub);
    done();
  });
});
