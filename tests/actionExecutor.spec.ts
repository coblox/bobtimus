import { Result } from "@badrap/result/dist";
import { networks } from "bitcoinjs-lib";
import BN = require("bn.js");
import nock from "nock";
import { Action, Field } from "../gen/siren";
import { ActionExecutor } from "../src/actionExecutor";
import { Satoshis } from "../src/bitcoin/blockchain";
import { ComitNode, Swap } from "../src/comitNode";
import { Config } from "../src/config";
import { FieldDataSource } from "../src/fieldDataSource";
import DummyDatastore from "./doubles/dummyDatastore";
import DummyLedgerExecutor, {
  dummyTransactionReceipt
} from "./doubles/dummyLedgerExecutor";
import acceptedStub from "./stubs/accepted.json";
import swapsAcceptDeclineStub from "./stubs/bitcoinEther/swapsWithAcceptDecline.siren.json";
import swapsFundBitcoinEtherStub from "./stubs/bitcoinEther/swapsWithFund.siren.json";
import swapsRedeemBitcoinEther from "./stubs/bitcoinEther/swapsWithRedeem.siren.json";
import swapsRefundEther from "./stubs/bitcoinEther/swapsWithRefund.siren.json";
import swapsFundEtherBitcoinStub from "./stubs/etherBitcoin/swapsWithFund.siren.json";
import swapsRedeemEtherBitcoin from "./stubs/etherBitcoin/swapsWithRedeem.siren.json";
import swapsRefundBitcoin from "./stubs/etherBitcoin/swapsWithRefund.siren.json";
import fundBitcoin from "./stubs/fundBitcoin.json";
import fundEther from "./stubs/fundEther.json";
import redeemBitcoin from "./stubs/redeemBitcoin.json";
import redeemEther from "./stubs/redeemEther.json";
import refundBitcoin from "./stubs/refundBitcoin.json";
import refundEther from "./stubs/refundEther.json";

const config = new Config({
  comitNodeUrl: "http://localhost:8000",
  seedWords:
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon",
  rates: {
    ether: { bitcoin: 0.0105 },
    bitcoin: { ether: 105.26 }
  },
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

const comitNode = new ComitNode(config);

describe("Action executor tests: ", () => {
  it("should post accept action and get stubbed response", async done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsAcceptDeclineStub);
    nock("http://localhost:8000")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .reply(200, acceptedStub);

    const datastore: FieldDataSource = {
      getData: (field: Field) => {
        expect(field).toHaveProperty("name", "beta_ledger_refund_identity");
        expect(field).toHaveProperty("class", ["address", "ethereum"]);
        return "0xcb777414c38e426c7038a7c4908751f5e864f7ad";
      }
    };
    const actionTriggerer = new ActionExecutor(
      comitNode,
      datastore,
      new DummyLedgerExecutor()
    );
    const swap = swapsAcceptDeclineStub.entities[0] as Swap;
    const acceptAction = swap.actions.find(
      action => action.name === "accept"
    ) as Action;

    const actionResponse = await actionTriggerer.execute(acceptAction, 0);

    expect(actionResponse).toStrictEqual(Result.ok(acceptedStub));

    done();
  });

  it("should not execute the same action twice", async done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsAcceptDeclineStub);
    nock("http://localhost:8000")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .reply(200, acceptedStub);

    const getData = jest.fn();
    getData.mockReturnValueOnce("0xcb777414c38e426c7038a7c4908751f5e864f7ad");

    const datastore: FieldDataSource = {
      getData
    };
    const actionExecutor = new ActionExecutor(
      comitNode,
      datastore,
      new DummyLedgerExecutor()
    );
    const swap = swapsAcceptDeclineStub.entities[0] as Swap;
    const acceptAction = swap.actions.find(
      action => action.name === "accept"
    ) as Action;

    const actionResponse = await actionExecutor.execute(acceptAction, 0);

    expect(actionResponse).toStrictEqual(Result.ok(acceptedStub));

    const actionResponse2 = await actionExecutor.execute(acceptAction, 0);

    expect(actionResponse2.isErr).toBeTruthy();

    done();
  });

  it("should retry action with timeout", async done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsAcceptDeclineStub);
    const scope = nock("http://localhost:8000")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .replyWithError("Oh no, we ran out of bananas.")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .reply(200, acceptedStub);

    const getData = jest.fn();
    getData.mockReturnValueOnce("0xcb777414c38e426c7038a7c4908751f5e864f7ad");

    const datastore: FieldDataSource = {
      getData
    };
    const actionExecutor = new ActionExecutor(
      comitNode,
      datastore,
      new DummyLedgerExecutor()
    );
    const swap = swapsAcceptDeclineStub.entities[0] as Swap;
    const acceptAction = swap.actions.find(
      action => action.name === "accept"
    ) as Action;

    const actionResponse = await actionExecutor.execute(acceptAction, 1, 2);

    expect(actionResponse).toStrictEqual(Result.ok(acceptedStub));

    expect(scope.isDone()).toBeTruthy();

    done();
  });

  it("should retry action and still fail if nothing changed (no endless loop)", async done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsAcceptDeclineStub);
    const scope = nock("http://localhost:8000")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .replyWithError("Oh no, we ran out of bananas.")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .replyWithError("You're telling me still no bananas?")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .replyWithError("🙈🙉🙊");

    const getData = jest.fn();
    const actionExecutor = new ActionExecutor(
      comitNode,
      {
        getData
      },
      new DummyLedgerExecutor()
    );
    const swap = swapsAcceptDeclineStub.entities[0] as Swap;
    const acceptAction = swap.actions.find(
      action => action.name === "accept"
    ) as Action;

    const actionResponse = await actionExecutor.execute(acceptAction, 2, 2);

    expect(actionResponse).toStrictEqual(
      Result.err(new Error("Maximum number of retries reached"))
    );

    // check the mock finished execution as expected
    expect(scope.isDone()).toBeTruthy();

    done();
  });
});

describe("Ledger action execution tests:", () => {
  it("execute the fund action on Ethereum using the right parameters", async done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsFundBitcoinEtherStub);
    nock("http://localhost:8000")
      .get("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/fund")
      .reply(200, fundEther);

    const mockEthereumDeployContract = jest.fn(() => {
      return Promise.resolve(dummyTransactionReceipt);
    });

    const ledgerExecutor = new DummyLedgerExecutor();
    ledgerExecutor.ethereumDeployContract = mockEthereumDeployContract;
    const actionExecutor = new ActionExecutor(
      comitNode,
      new DummyDatastore(),
      ledgerExecutor
    );
    const swap = swapsFundBitcoinEtherStub.entities[0] as Swap;

    const fundAction = swap.actions.find(
      action => action.name === "fund"
    ) as Action;
    const actionResponse = await actionExecutor.execute(fundAction, 0);

    expect(actionResponse).toStrictEqual(Result.ok(dummyTransactionReceipt));

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

    done();
  });

  it("execute the fund action on Bitcoin using the right parameters", async done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsFundEtherBitcoinStub);
    nock("http://localhost:8000")
      .get("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/fund")
      .reply(200, fundBitcoin);

    const txId =
      "001122334455667788990011223344556677889900112233445566778899aabb";

    const mockBitcoinPayToAddress = jest.fn(() => {
      return Promise.resolve(txId);
    });

    const ledgerExecutor = new DummyLedgerExecutor();
    ledgerExecutor.bitcoinPayToAddress = mockBitcoinPayToAddress;
    const actionExecutor = new ActionExecutor(
      comitNode,
      new DummyDatastore(),
      ledgerExecutor
    );
    const swap = swapsFundEtherBitcoinStub.entities[0] as Swap;

    const fundAction = swap.actions.find(
      action => action.name === "fund"
    ) as Action;
    const actionResponse = await actionExecutor.execute(fundAction, 0);
    expect(actionResponse).toStrictEqual(Result.ok(txId));

    expect(mockBitcoinPayToAddress.mock.calls.length).toBe(1);
    expect(mockBitcoinPayToAddress.mock.calls[0].length).toBe(3);
    // @ts-ignore: TS expects calls[0] to be of length 0 for some reason
    const addressPassed = mockBitcoinPayToAddress.mock.calls[0][0];
    // @ts-ignore: TS expects calls[0] to be of length 0 for some reason
    const satPassed = mockBitcoinPayToAddress.mock.calls[0][1];
    // @ts-ignore: TS expects calls[0] to be of length 0 for some reason
    const networkPassed = mockBitcoinPayToAddress.mock.calls[0][2];

    expect(addressPassed).toEqual(
      "bcrt1q4vmcukhvmd2lajgk9az24s3fndm4swrkl633lq"
    );
    expect(satPassed).toEqual(new Satoshis("100000000"));
    expect(networkPassed).toEqual(networks.regtest);

    done();
  });

  it("execute the redeem action on Bitcoin using the right parameters", async done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsRedeemBitcoinEther);
    nock("http://localhost:8000")
      .get(
        "/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/redeem?alpha_ledger_redeem_identity=bcrt1q6rhpng9evdsfnn833a4f4vej0asu6dk5srld6x&fee_per_byte=180"
      )
      .reply(200, redeemBitcoin);

    const mockGetData = jest.fn();
    mockGetData
      .mockReturnValueOnce("bcrt1q6rhpng9evdsfnn833a4f4vej0asu6dk5srld6x")
      .mockReturnValueOnce(180);
    const datastore = new DummyDatastore();
    datastore.getData = mockGetData;

    const mockBitcoinBroadcastTransaction = jest.fn();
    mockBitcoinBroadcastTransaction.mockReturnValueOnce(
      "aabbccddeeffaabbccddeeffaabbccddeeffaabbccddeeffaabbccddeeff1122"
    );
    const ledgerExecutor = new DummyLedgerExecutor();
    ledgerExecutor.bitcoinBroadcastTransaction = mockBitcoinBroadcastTransaction;
    const actionExecutor = new ActionExecutor(
      comitNode,
      datastore,
      ledgerExecutor
    );
    const swap = swapsRedeemBitcoinEther.entities[0] as Swap;

    const redeemAction = swap.actions.find(
      action => action.name === "redeem"
    ) as Action;
    const actionResponse = await actionExecutor.execute(redeemAction, 0);

    expect(actionResponse).toStrictEqual(
      Result.ok(
        "aabbccddeeffaabbccddeeffaabbccddeeffaabbccddeeffaabbccddeeff1122"
      )
    );

    done();
  });

  it("execute the redeem action on Ethereum using the right parameters", async done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsRedeemEtherBitcoin);
    nock("http://localhost:8000")
      .get("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/redeem")
      .reply(200, redeemEther);

    const datastore = new DummyDatastore();
    const ledgerExecutor = new DummyLedgerExecutor();
    const mockEthereumSendTransactionTo = jest.fn();
    mockEthereumSendTransactionTo.mockReturnValueOnce(
      Promise.resolve(dummyTransactionReceipt)
    );
    ledgerExecutor.ethereumSendTransactionTo = mockEthereumSendTransactionTo;
    const actionExecutor = new ActionExecutor(
      comitNode,
      datastore,
      ledgerExecutor
    );
    const swap = swapsRedeemEtherBitcoin.entities[0] as Swap;

    const redeemAction = swap.actions.find(
      action => action.name === "redeem"
    ) as Action;
    const actionResponse = await actionExecutor.execute(redeemAction, 0);

    expect(actionResponse).toStrictEqual(Result.ok(dummyTransactionReceipt));

    expect(mockEthereumSendTransactionTo.mock.calls[0].length).toBe(1);
    // @ts-ignore: TS expects calls[0] to be of length 0 for some reason
    const argPassed = mockEthereumSendTransactionTo.mock.calls[0][0];
    expect(argPassed.value).toBeUndefined();
    expect(argPassed.gasLimit.toString("hex")).toEqual("186a0");
    expect(argPassed.network).toEqual("regtest");
    expect(argPassed.to).toEqual("0x1189128ff5573f6282dbbf1557ed839dab277aeb");
    expect(argPassed.data).toEqual(
      "0x00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"
    );

    done();
  });

  it("executing the fund + redeem action", async done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsFundBitcoinEtherStub)
      .get("/swaps/rfc003/")
      .reply(200, swapsRedeemEtherBitcoin)
      .get("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/fund")
      .reply(200, fundEther)
      .get("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/redeem")
      .reply(200, redeemEther);

    const ledgerExecutor = new DummyLedgerExecutor();

    const mockEthereumSendTransactionTo = jest.fn();
    mockEthereumSendTransactionTo.mockReturnValueOnce(
      Promise.resolve(dummyTransactionReceipt)
    );
    ledgerExecutor.ethereumSendTransactionTo = mockEthereumSendTransactionTo;

    ledgerExecutor.ethereumDeployContract = jest.fn(() => {
      return Promise.resolve(dummyTransactionReceipt);
    });

    const actionExecutor = new ActionExecutor(
      comitNode,
      new DummyDatastore(),
      ledgerExecutor
    );
    const fundSwap = swapsFundBitcoinEtherStub.entities[0] as Swap;

    const fundAction = fundSwap.actions.find(
      action => action.name === "fund"
    ) as Action;

    const redeemSwap = swapsRedeemEtherBitcoin.entities[0] as Swap;
    const redeemAction = redeemSwap.actions.find(
      action => action.name === "redeem"
    ) as Action;

    const actionResult1 = await actionExecutor.execute(fundAction, 0);
    const actionResult2 = await actionExecutor.execute(redeemAction, 0);

    expect(actionResult1).toBeDefined();
    expect(actionResult2).toBeDefined();

    done();
  });

  it("execute refund action on Bitcoin", async done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsRefundBitcoin);
    nock("http://localhost:8000")
      .get(
        "/swaps/rfc003/022b4e38-61fd-431a-af44-6240c7ac44d7/refund?address=bcrt1qs2aderg3whgu0m8uadn6dwxjf7j3wx97kk2qqtrum89pmfcxknhsf89pj0&fee_per_byte=180"
      )
      .reply(200, refundBitcoin);

    const mockGetData = jest.fn();
    mockGetData
      .mockReturnValueOnce(
        "bcrt1qs2aderg3whgu0m8uadn6dwxjf7j3wx97kk2qqtrum89pmfcxknhsf89pj0"
      )
      .mockReturnValueOnce(180);
    const datastore = new DummyDatastore();
    datastore.getData = mockGetData;

    const mockBitcoinBroadcastTransaction = jest.fn();
    mockBitcoinBroadcastTransaction.mockReturnValueOnce(
      "bitcoinrefundtransactionresponse"
    );
    const ledgerExecutor = new DummyLedgerExecutor();
    ledgerExecutor.bitcoinBroadcastTransaction = mockBitcoinBroadcastTransaction;
    const actionExecutor = new ActionExecutor(
      comitNode,
      datastore,
      ledgerExecutor
    );
    const swap = swapsRefundBitcoin.entities[0] as Swap;

    const refundAction = swap.actions.find(
      action => action.name === "refund"
    ) as Action;
    const actionResponse = await actionExecutor.execute(refundAction, 0);

    expect(actionResponse).toStrictEqual(
      Result.ok("bitcoinrefundtransactionresponse")
    );

    done();
  });

  it("execute refund action on Ethereum ", async done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsRefundEther);
    nock("http://localhost:8000")
      .get("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/refund")
      .reply(200, refundEther);

    const datastore = new DummyDatastore();
    const ledgerExecutor = new DummyLedgerExecutor();
    const mockEthereumSendTransactionTo = jest.fn();
    mockEthereumSendTransactionTo.mockReturnValueOnce(
      Promise.resolve(dummyTransactionReceipt)
    );
    ledgerExecutor.ethereumSendTransactionTo = mockEthereumSendTransactionTo;
    const actionExecutor = new ActionExecutor(
      comitNode,
      datastore,
      ledgerExecutor
    );
    const swap = swapsRefundEther.entities[0] as Swap;

    const refundAction = swap.actions.find(
      action => action.name === "refund"
    ) as Action;
    const actionResponse = await actionExecutor.execute(refundAction, 0);

    expect(actionResponse).toStrictEqual(Result.ok(dummyTransactionReceipt));

    expect(mockEthereumSendTransactionTo.mock.calls[0].length).toBe(1);
    // @ts-ignore: TS expects calls[0] to be of length 0 for some reason
    const argPassed = mockEthereumSendTransactionTo.mock.calls[0][0];
    expect(argPassed.value).toBeUndefined();
    expect(argPassed.gasLimit.toString("hex")).toEqual("186a0");
    expect(argPassed.network).toEqual("regtest");
    expect(argPassed.to).toEqual("0xa2f623a7aec2f71c17687ee234e3fd816b0fb917");
    expect(argPassed.data).toEqual("0x");

    done();
  });
});
