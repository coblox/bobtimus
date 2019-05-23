import nock from "nock";
import { from, range } from "rxjs";
import { filter, flatMap, map, tap } from "rxjs/operators";
import { ActionExecutor } from "../../src/actionExecutor";
import poll from "../../src/actionPoller";
import { ActionSelector } from "../../src/actionSelector";
import { ComitNode } from "../../src/comitNode";
import { Config } from "../../src/config";
import { Datastore } from "../../src/datastore";
import acceptedStub from "./../stubs/accepted.json";
import swapsAcceptDeclineStub from "./../stubs/bitcoinEther/swapsWithAcceptDecline.siren.json";

describe("Full workflow tests: ", () => {
  beforeEach(() => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003")
      .reply(200, swapsAcceptDeclineStub);

    nock("http://localhost:8000")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .reply(200, acceptedStub);
  });

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
  const datastore = new Datastore(config);
  const actionSelector = new ActionSelector(config);
  const actionExecutor = new ActionExecutor(config, datastore);
  const comitNode = new ComitNode(config);

  it("should get actions and accept", done => {
    let success = false;

    poll(comitNode, range(0, 1))
      .pipe(map(swap => actionSelector.selectAction(swap)))
      .pipe(
        tap(actionResult => {
          expect(actionResult.isOk).toBeTruthy();
        })
      )
      .pipe(filter(action => action.isOk))
      .pipe(map(actionResult => actionResult.unwrap()))
      .pipe(map(action => actionExecutor.execute(action)))
      .pipe(flatMap(actionResponse => from(actionResponse)))
      .subscribe(
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
});