import nock from "nock";
import { from } from "rxjs";
import { Action } from "../gen/siren";
import { ActionExecutor } from "../src/actionExecutor";
import { Swap } from "../src/comitNode";
import { Config } from "../src/config";
import { Datastore } from "../src/datastore";
import acceptedStub from "./stubs/accepted.json";
import swapsAcceptDeclineStub from "./stubs/bitcoinEther/swapsWithAcceptDecline.siren.json";

const config = new Config({
  comitNodeUrl: "http://localhost:8000",
  seedWords:
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon",
  rates: { ether: { bitcoin: { sell: 0.0095, buy: 0.0105 } } },
  ledgers: {
    bitcoin: {
      type: "coreRpc",
      rpcUsername: "bitcoin",
      rpcPassword: "password",
      rpcHost: "127.0.0.1",
      rpcPort: 18443,
      network: "regtest"
    },
    ethereum: {
      web3Endpoint: "http://localhost:8545"
    }
  }
});

describe("Action triggerer tests: ", () => {
  beforeEach(() => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsAcceptDeclineStub);

    nock("http://localhost:8000")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .reply(200, acceptedStub);
  });

  it("should post accept action and get stubbed response", done => {
    const datastore = new Datastore(config);
    const actionTriggerer = new ActionExecutor(config, datastore);
    const swap = swapsAcceptDeclineStub.entities[0] as Swap;
    const acceptAction = swap.actions.find(
      action => action.name === "accept"
    ) as Action;
    from(actionTriggerer.execute(acceptAction)).subscribe(
      actionResponse => {
        expect(actionResponse).toStrictEqual(acceptedStub);
      },
      error => {
        fail(error);
      },
      () => {
        done();
      }
    );
  });
});
