import BN = require("bn.js");
import nock from "nock";
import { from, range } from "rxjs";
import { filter, flatMap, map, tap } from "rxjs/operators";
import { ActionExecutor } from "../../src/actionExecutor";
import poll from "../../src/actionPoller";
import { ActionSelector } from "../../src/actionSelector";
import { BitcoinFeeService } from "../../src/bitcoin/bitcoinFeeService";
import { ComitNode } from "../../src/comitNode";
import { Config } from "../../src/config";
import { Datastore } from "../../src/datastore";
import { EthereumGasPriceService } from "../../src/ethereum/ethereumGasPriceService";
import { LedgerExecutor } from "../../src/ledgerExecutor";
import { EthereumWallet } from "../../src/wallets/ethereum";
import { MockBitcoinBlockchain } from "../doubles/bitcoinBlockchain";
import { getDummyBitcoinWallet } from "../doubles/bitcoinWallet";
import swapsWithFundStub from "../stubs/bitcoinEther/swapsWithFund.siren.json";
import fundBitcoinStub from "../stubs/fundBitcoin.json";
import acceptedStub from "./../stubs/accepted.json";
import swapsAcceptDeclineStub from "./../stubs/etherBitcoin/swapsWithAcceptDecline.siren.json";

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
// @ts-ignore: config.bitcoinConfig is expected to exist
const bitcoinBlockchain = new MockBitcoinBlockchain();
const ethereumWallet = EthereumWallet.fromConfig(
  // @ts-ignore: config.ethereumConfig is expected to exist
  config.ethereumConfig,
  config.seed,
  1
);
describe("Alpha Ether/Beta Bitcoin Full workflow tests: ", () => {
  const actionSelector = new ActionSelector(config);
  const comitNode = new ComitNode(config);

  it("should get actions and accept", done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003")
      .reply(200, swapsAcceptDeclineStub);

    nock("http://localhost:8000")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .reply(200, acceptedStub);

    const bitcoinWallet = getDummyBitcoinWallet();
    const ledgerExecutor = new LedgerExecutor({
      bitcoinWallet,
      ethereumWallet,
      bitcoinBlockchain,
      bitcoinFeeService: BitcoinFeeService.default(),
      ethereumFeeService: EthereumGasPriceService.default()
    });
    const datastore = new Datastore({ ethereumWallet, bitcoinWallet });
    const actionExecutor = new ActionExecutor(
      comitNode,
      datastore,
      ledgerExecutor
    );

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

  it("should get actions and fund Bitcoin", async done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003")
      .reply(200, swapsWithFundStub);

    nock("http://localhost:8000")
      .get("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/fund")
      .reply(200, fundBitcoinStub);

    const bitcoinWallet = getDummyBitcoinWallet();
    const mockPayToAddress = jest.fn(() => {
      return Promise.resolve(
        "001122334455667788990011223344556677889900112233445566778899aabb"
      );
    });
    bitcoinWallet.payToAddress = mockPayToAddress;
    const ledgerExecutor = new LedgerExecutor({
      bitcoinWallet,
      ethereumWallet,
      bitcoinBlockchain,
      bitcoinFeeService: BitcoinFeeService.default(),
      ethereumFeeService: EthereumGasPriceService.default()
    });
    const datastore = new Datastore({ ethereumWallet, bitcoinWallet });
    const actionExecutor = new ActionExecutor(
      comitNode,
      datastore,
      ledgerExecutor
    );

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
        resp => {
          expect(resp.isOk).toBeTruthy();
          expect(mockPayToAddress.mock.calls.length).toBe(1);

          success = true;
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
