import nock from 'nock';

import acceptedStub from "./stubs/accepted.json";
import swapsAcceptDeclineStub from "./stubs/swaps_with_accept_decline.siren.json";
import {ActionExecutor} from "../src/action_executor";
import {Datastore} from "../src/datastore";
import {expect} from "chai";
import {Swap} from "../src/comit_node";
import {Action} from "../gen/siren";
import {from} from "rxjs";

describe("Action triggerer tests: ", () => {

    beforeEach(() => {
        nock('http://localhost:8000')
            .get('/swaps/rfc003/')
            .reply(200, swapsAcceptDeclineStub);

        nock('http://localhost:8000')
            .post('/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept')
            .reply(200, acceptedStub);
    });

    it("should post accept action and get stubbed response", done => {
        let actionTriggerer = new ActionExecutor(new Datastore());
        const swap = swapsAcceptDeclineStub.entities[0] as Swap;
        const acceptAction = swap.actions.find((action) => action.name === "accept") as Action;
        from(actionTriggerer.execute(acceptAction))
            .subscribe(
                (action_response) => {
                    expect(action_response).deep.equal(acceptedStub);
                },
                (error) => {
                    expect.fail(`error: ${error}`);
                },
                () => {
                    done();
                }
            );
    });

});