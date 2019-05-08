import "mocha";
import nock from 'nock';
import * as Index from "../src/index";
import {expect} from "chai";
import {of} from "rxjs";

const accepted = require('./responses/accepted');

describe("index", () => {

    beforeEach(() => {
        nock('http://localhost:8000')
            .post('/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept')
            .reply(200, accepted);
    });

    it("should get actions to accept", done => {
        Index.start(of(1))
            .subscribe(
                (action_response_result) => {
                    console.debug(action_response_result);
                    expect(action_response_result.isOk).to.be.true;
                    expect(action_response_result.unwrap()).deep.equal(accepted);
                },
                (error) => {
                    expect.fail(`error: ${error}`);
                },
                () => {
                    console.log("done");
                    done();
                }
            );
    });

});
