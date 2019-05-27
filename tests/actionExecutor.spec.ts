import { Result } from "@badrap/result/dist";
import BN = require("bn.js");
import nock from "nock";
import { from } from "rxjs";
import { Action, Field } from "../gen/siren";
import { ActionExecutor } from "../src/actionExecutor";
import { Swap } from "../src/comitNode";
import { Config } from "../src/config";
import { IDatastore } from "../src/datastore";
import {
  emptyTransactionReceipt,
  getLedgerExecutorThrowsOnAll
} from "./ledgerExecutor";
import acceptedStub from "./stubs/accepted.json";
import swapsAcceptDeclineStub from "./stubs/bitcoinEther/swapsWithAcceptDecline.siren.json";
import swapsFundStub from "./stubs/bitcoinEther/swapsWithFund.siren.json";
import fundEther from "./stubs/fundEther.json";

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

describe("Action executor tests: ", () => {
  it("should post accept action and get stubbed response", done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsAcceptDeclineStub);
    nock("http://localhost:8000")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .reply(200, acceptedStub);

    const datastore: IDatastore = {
      getData: (field: Field) => {
        expect(field).toHaveProperty("name", "beta_ledger_refund_identity");
        expect(field).toHaveProperty("class", ["address", "ethereum"]);
        return "0xcb777414c38e426c7038a7c4908751f5e864f7ad";
      }
    };
    const actionTriggerer = new ActionExecutor(
      config,
      datastore,
      getLedgerExecutorThrowsOnAll()
    );
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

describe("Ledger action execution tests:", () => {
  it("execute the fund action on ethereum using the right parameters", done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsFundStub);
    nock("http://localhost:8000")
      .get("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/fund")
      .reply(200, fundEther);

    const datastore: IDatastore = {
      getData: (field: Field) => {
        throw new Error(`someone asked for ${JSON.stringify(field)}`);
      }
    };

    const mockEthereumDeployContract = jest.fn(() => {
      return Promise.resolve(emptyTransactionReceipt);
    });

    const ledgerExecutor = getLedgerExecutorThrowsOnAll();
    ledgerExecutor.ethereumDeployContract = mockEthereumDeployContract;
    const actionExecutor = new ActionExecutor(
      config,
      datastore,
      ledgerExecutor
    );
    const swap = swapsFundStub.entities[0] as Swap;

    const fundAction = swap.actions.find(
      action => action.name === "fund"
    ) as Action;
    from(actionExecutor.execute(fundAction)).subscribe(
      actionResponse => {
        expect(actionResponse).toStrictEqual(
          Result.ok(emptyTransactionReceipt)
        );

        expect(mockEthereumDeployContract.mock.calls.length).toBe(1); // Expect one call
        expect(mockEthereumDeployContract.mock.calls[0].length).toBe(1); // Expect one argument on the first call
        // @ts-ignore: TS expects calls[0] to be of length 0 for some reason
        const argumentPassed = mockEthereumDeployContract.mock.calls[0][0];

        expect(argumentPassed).toHaveProperty(
          "value",
          new BN("111111111111111111111")
        );
        expect(argumentPassed).toHaveProperty(
          "data",
          Buffer.from("6100dcff", "hex")
        );
        expect(argumentPassed).toHaveProperty("gasLimit");
        // @ts-ignore: gasLimit exists as tested above
        expect(argumentPassed.gasLimit.toString()).toEqual(
          new BN(122000).toString()
        );
        expect(argumentPassed).toHaveProperty("network", "regtest");
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
