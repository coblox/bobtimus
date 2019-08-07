import { Result } from "@badrap/result/dist";
import nock from "nock";
import URI from "urijs";
import { Action, Field } from "../gen/siren";
import { ActionExecutor } from "../src/actionExecutor";
import { ComitNode, Swap } from "../src/comitNode";
import acceptedStub from "./stubs/accepted.json";
import swapsAcceptDeclineStub from "./stubs/bitcoinEther/swapsWithAcceptDecline.siren.json";
import swapsFundBitcoinEtherStub from "./stubs/bitcoinEther/swapsWithFund.siren.json";
import swapsRedeemBitcoinEther from "./stubs/bitcoinEther/swapsWithRedeem.siren.json";
import swapsFundEtherBitcoinStub from "./stubs/etherBitcoin/swapsWithFund.siren.json";
import swapsRedeemEtherBitcoin from "./stubs/etherBitcoin/swapsWithRedeem.siren.json";
import fundBitcoin from "./stubs/fundBitcoin.json";
import fundEther from "./stubs/fundEther.json";
import redeemBitcoin from "./stubs/redeemBitcoin.json";
import redeemEther from "./stubs/redeemEther.json";
import dummyTransactionReceipt from "./stubs/transactionReceipt.json";

const cndUrl = new URI("http://localhost:8000");
const comitNode = new ComitNode(cndUrl);

const throwIfCalled = () => {
  throw new Error(`Should not be called`);
};

describe("Action executor tests: ", () => {
  it("should post accept action and get stubbed response", async done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003/")
      .reply(200, swapsAcceptDeclineStub);
    nock("http://localhost:8000")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .reply(200, acceptedStub);

    const getData = (field: Field) => {
      expect(field).toHaveProperty("name", "beta_ledger_refund_identity");
      expect(field).toHaveProperty("class", ["address", "ethereum"]);
      return "0xcb777414c38e426c7038a7c4908751f5e864f7ad";
    };
    const actionExecutor = new ActionExecutor(
      comitNode,
      getData,
      throwIfCalled
    );
    const swap = swapsAcceptDeclineStub.entities[0] as Swap;
    const acceptAction = swap.actions.find(
      action => action.name === "accept"
    ) as Action;

    const actionResponse = await actionExecutor.execute(acceptAction, 0);

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

    const actionExecutor = new ActionExecutor(
      comitNode,
      getData,
      throwIfCalled
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

    const actionExecutor = new ActionExecutor(
      comitNode,
      getData,
      throwIfCalled
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
      getData,
      throwIfCalled
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
      return Promise.resolve(Result.ok(dummyTransactionReceipt));
    });

    const actionExecutor = new ActionExecutor(
      comitNode,
      throwIfCalled,
      mockEthereumDeployContract
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

    expect(argumentPassed).toEqual({
      payload: {
        amount: "111111111111111111111",
        data: "0x6100dcff",
        gas_limit: "0x1dc90",
        network: "regtest"
      },
      type: "ethereum-deploy-contract"
    });

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
      return Promise.resolve(Result.ok(txId));
    });

    const actionExecutor = new ActionExecutor(
      comitNode,
      throwIfCalled,
      mockBitcoinPayToAddress
    );
    const swap = swapsFundEtherBitcoinStub.entities[0] as Swap;

    const fundAction = swap.actions.find(
      action => action.name === "fund"
    ) as Action;
    const actionResponse = await actionExecutor.execute(fundAction, 0);
    expect(actionResponse).toStrictEqual(Result.ok(txId));

    expect(mockBitcoinPayToAddress.mock.calls.length).toBe(1);
    expect(mockBitcoinPayToAddress.mock.calls[0].length).toBe(1);
    // @ts-ignore: TS expects calls[0] to be of length 0 for some reason
    const ledgerActionPassed = mockBitcoinPayToAddress.mock.calls[0][0];

    expect(ledgerActionPassed).toEqual({
      payload: {
        amount: "100000000",
        network: "regtest",
        to: "bcrt1q4vmcukhvmd2lajgk9az24s3fndm4swrkl633lq"
      },
      type: "bitcoin-send-amount-to-address"
    });

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

    const mockBitcoinBroadcastTransaction = jest.fn();
    mockBitcoinBroadcastTransaction.mockReturnValueOnce(
      Promise.resolve(
        Result.ok(
          "aabbccddeeffaabbccddeeffaabbccddeeffaabbccddeeffaabbccddeeff1122"
        )
      )
    );
    const actionExecutor = new ActionExecutor(
      comitNode,
      mockGetData,
      mockBitcoinBroadcastTransaction
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

    const mockEthereumSendTransactionTo = jest.fn();
    mockEthereumSendTransactionTo.mockReturnValueOnce(
      Promise.resolve(Result.ok(dummyTransactionReceipt))
    );
    const actionExecutor = new ActionExecutor(
      comitNode,
      throwIfCalled,
      mockEthereumSendTransactionTo
    );
    const swap = swapsRedeemEtherBitcoin.entities[0] as Swap;

    const redeemAction = swap.actions.find(
      action => action.name === "redeem"
    ) as Action;
    const actionResponse = await actionExecutor.execute(redeemAction, 0);

    expect(actionResponse).toStrictEqual(Result.ok(dummyTransactionReceipt));

    expect(mockEthereumSendTransactionTo.mock.calls[0].length).toBe(1);
    // @ts-ignore: TS expects calls[0] to be of length 0 for some reason
    const ledgerActionPassed = mockEthereumSendTransactionTo.mock.calls[0][0];
    expect(ledgerActionPassed).toEqual({
      payload: {
        contract_address: "0x1189128ff5573f6282dbbf1557ed839dab277aeb",
        data:
          "0x00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
        gas_limit: "0x186a0",
        network: "regtest"
      },
      type: "ethereum-call-contract"
    });

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

    const mockEthereumSendTransactionAndDeploy = jest.fn();
    mockEthereumSendTransactionAndDeploy
      .mockReturnValueOnce(Promise.resolve(Result.ok(dummyTransactionReceipt)))
      .mockReturnValueOnce(Promise.resolve(Result.ok(dummyTransactionReceipt)));

    const actionExecutor = new ActionExecutor(
      comitNode,
      throwIfCalled,
      mockEthereumSendTransactionAndDeploy
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
});
