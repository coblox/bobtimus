import "mocha";
import nock from 'nock';
import * as ActionPoller from "../src/action_poller";
import {expect} from "chai";
import {range} from "rxjs";
import acceptedStub from "./stubs/accepted.json";
import swapsAcceptDeclineStub from "./stubs/swaps_with_accept_decline.siren.json";


describe("Full workflow tests: ", () => {

    beforeEach(() => {
        nock('http://localhost:8000')
            .get('/swaps/rfc003/')
            .reply(200, swapsAcceptDeclineStub);

        nock('http://localhost:8000')
            .post('/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept')
            .reply(200, acceptedStub);
    });

    it("should get actions and accept", done => {
        ActionPoller.start(range(0, 1))
            .subscribe(
                (action_response) => {
                    console.debug(action_response);
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
