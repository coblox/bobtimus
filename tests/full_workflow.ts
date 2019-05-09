import "mocha";
import nock from "nock";
import * as ActionPoller from "../src/action_poller";
import { expect } from "chai";
import { from, range } from "rxjs";
import acceptedStub from "./stubs/accepted.json";
import swapsAcceptDeclineStub from "./stubs/swaps_with_accept_decline.siren.json";
import { filter, flatMap, map, tap } from "rxjs/operators";
import { ActionExecutor } from "../src/action_executor";
import { selectAction } from "../src/action_selector";
import { Datastore } from "../src/datastore";

describe("Full workflow tests: ", () => {
  beforeEach(() => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsAcceptDeclineStub);

    nock("http://localhost:8000")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .reply(200, acceptedStub);
  });

  const datastore = new Datastore();
  const actionExecutor = new ActionExecutor(datastore);

  it("should get actions and accept", done => {
    let success = false;

    ActionPoller.poll(range(0, 1))
      .pipe(map(swap => selectAction(swap)))
      .pipe(
        tap(action_result => {
          expect(action_result.isOk).to.be.true;
        })
      )
      .pipe(filter(action => action.isOk))
      .pipe(map(action_result => action_result.unwrap()))
      .pipe(map(action => actionExecutor.execute(action)))
      .pipe(flatMap(action_response => from(action_response)))
      .subscribe(
        action_response => {
          success = true;
          console.debug(action_response);
          expect(action_response).deep.equal(acceptedStub);
        },
        error => {
          console.log(error);
          expect.fail(`error: ${error}`);
        },
        () => {
          expect(success).to.be.true;
          done();
        }
      );
  });
});
