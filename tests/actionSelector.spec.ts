import { Entity } from "../gen/siren";
import { ActionSelector } from "../src/actionSelector";
import Asset from "../src/asset";
import Ledger from "../src/ledger";
import swapsAcceptDeclineStub from "./stubs/bitcoinEther/swapsWithAcceptDecline.siren.json";
import swapsDogecoinAcceptDeclineStub from "./stubs/bitcoinEther/swapsWithDogecoinAcceptDecline.siren.json";
import swapsErc20AcceptDeclineStub from "./stubs/bitcoinEther/swapsWithErc20AcceptDecline.siren.json";
import swapsRedeemBitcoinEther from "./stubs/bitcoinEther/swapsWithRedeem.siren.json";
import swapsFundEtherBitcoinStub from "./stubs/etherBitcoin/swapsWithFund.siren.json";
import swapsRedeemRefundStub from "./stubs/etherBitcoin/swapsWithRedeemRefund.siren.json";
import swapsRefundStub from "./stubs/etherBitcoin/swapsWithRefund.siren.json";

function extractEntityAndAction(json: any, actionName: string) {
  const entity = json.entities[0] as Entity | undefined;

  if (!entity) {
    throw new Error(`Entity could not be extracted from test data`);
  }

  if (!entity.actions) {
    throw new Error(`Entity did not contain any actions`);
  }

  const action = entity.actions.find(element => element.name === actionName);

  if (!action) {
    throw new Error(`Entity did not contain action with name ${actionName}`);
  }

  return { entity, action };
}

function isAlwaysAcceptable() {
  return Promise.resolve(true);
}

function isNeverAcceptable() {
  return Promise.resolve(false);
}

function mustNotBeCalled(): Promise<boolean> {
  throw new Error("mustNotBeCalled is not supposed to be called");
}

const supportedLedgers = [Ledger.Ethereum, Ledger.Bitcoin];

describe("Action selector tests for Ethereum/Bitcoin: ", () => {
  it("Should emit accept only", async done => {
    const actionSelector = new ActionSelector(
      supportedLedgers,
      isAlwaysAcceptable
    );
    const { entity, action } = extractEntityAndAction(
      swapsAcceptDeclineStub,
      "accept"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });

  it("Should emit decline because the offer is not considered acceptable", async done => {
    const actionSelector = new ActionSelector(
      supportedLedgers,
      isNeverAcceptable
    );
    const { entity, action } = extractEntityAndAction(
      swapsAcceptDeclineStub,
      "decline"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });

  it("Should emit decline because of unsupported trading pair", async done => {
    const actionSelector = new ActionSelector(
      supportedLedgers,
      mustNotBeCalled
    );
    const { entity, action } = extractEntityAndAction(
      swapsDogecoinAcceptDeclineStub,
      "decline"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });

  it("Should emit decline because of unexpected pair", async done => {
    const actionSelector = new ActionSelector(
      [Ledger.Ethereum],
      mustNotBeCalled
    );
    const { entity, action } = extractEntityAndAction(
      swapsAcceptDeclineStub,
      "decline"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });

  it("Should emit redeem action", async done => {
    const actionSelector = new ActionSelector(
      supportedLedgers,
      mustNotBeCalled
    );
    const { entity, action } = extractEntityAndAction(
      swapsRedeemBitcoinEther,
      "redeem"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });

  it("Should emit fund action", async done => {
    const actionSelector = new ActionSelector(
      supportedLedgers,
      mustNotBeCalled
    );
    const { entity, action } = extractEntityAndAction(
      swapsFundEtherBitcoinStub,
      "fund"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });

  it("Should not emit fund action twice", async done => {
    const actionSelector = new ActionSelector(
      supportedLedgers,
      mustNotBeCalled
    );
    const { entity, action } = extractEntityAndAction(
      swapsFundEtherBitcoinStub,
      "fund"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);

    const actionResponse2 = await actionSelector.selectActions(entity);
    expect(actionResponse2).toBeUndefined();
    done();
  });

  it("Should emit refund action", async done => {
    const actionSelector = new ActionSelector(
      supportedLedgers,
      mustNotBeCalled
    );
    const { entity, action } = extractEntityAndAction(
      swapsRefundStub,
      "refund"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });

  it("Should emit refund first then redeem action", async done => {
    const actionSelector = new ActionSelector(
      supportedLedgers,
      mustNotBeCalled
    );

    {
      const { entity, action } = extractEntityAndAction(
        swapsRedeemRefundStub,
        "refund"
      );

      const actionResponse = await actionSelector.selectActions(entity);

      expect(actionResponse).toStrictEqual(action);
    }

    {
      const { entity, action } = extractEntityAndAction(
        swapsRedeemRefundStub,
        "redeem"
      );

      const actionResponse = await actionSelector.selectActions(entity);

      expect(actionResponse).toStrictEqual(action);
    }

    done();
  });
});

describe("Action selector test for ERC20", () => {
  it("Should emit accept only", async done => {
    const createAssetFromTokens = () => {
      return new Asset("PAY", Ledger.Ethereum, {
        address: "0xB97048628DB6B661D4C2aA833e95Dbe1A905B280",
        decimals: 18
      });
    };

    const actionSelector = new ActionSelector(
      supportedLedgers,
      isAlwaysAcceptable,
      createAssetFromTokens
    );
    const { entity, action } = extractEntityAndAction(
      swapsErc20AcceptDeclineStub,
      "accept"
    );

    const actionResponse = await actionSelector.selectActions(entity);
    expect(actionResponse).toStrictEqual(action);
    done();
  });
});
