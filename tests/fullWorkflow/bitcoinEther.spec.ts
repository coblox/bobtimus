import nock from "nock";
import { from, range } from "rxjs";
import { filter, flatMap, map, tap } from "rxjs/operators";
import { ActionExecutor } from "../../src/actionExecutor";
import poll from "../../src/actionPoller";
import { ActionSelector } from "../../src/actionSelector";
import { BitcoinCoreRpc } from "../../src/bitcoin/bitcoinCoreRpc";
import { ComitNode } from "../../src/comitNode";
import { Config } from "../../src/config";
import { Datastore } from "../../src/datastore";
import { BitcoinWallet } from "../../src/wallets/bitcoin";
import { EthereumWallet } from "../../src/wallets/ethereum";
import {
  emptyTransactionReceipt,
  getLedgerExecutorThrowsOnAll
} from "../ledgerExecutor";
import acceptedStub from "./../stubs/accepted.json";
import swapsAcceptDeclineStub from "./../stubs/bitcoinEther/swapsWithAcceptDecline.siren.json";
import swapsWithFundStub from "./../stubs/bitcoinEther/swapsWithFund.siren.json";
import fundEtherStub from "./../stubs/fundEther.json";

describe("Alpha Bitcoin/Beta Ether Full workflow tests: ", () => {
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
  // @ts-ignore: config.bitcoinConfig is expected to exist
  const bitcoinBlockchain = BitcoinCoreRpc.fromConfig(config.bitcoinConfig);
  const bitcoinWallet = BitcoinWallet.fromConfig(
    // @ts-ignore: config.bitcoinConfig is expected to exist
    config.bitcoinConfig,
    bitcoinBlockchain,
    config.seed,
    0
  );
  const ethereumWallet = EthereumWallet.fromConfig(
    // @ts-ignore: config.ethereumConfig is expected to exist
    config.ethereumConfig,
    config.seed,
    1
  );
  const datastore = new Datastore({ bitcoinWallet, ethereumWallet });
  const actionSelector = new ActionSelector(config);
  const comitNode = new ComitNode(config);

  it("should get actions and accept", done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003")
      .reply(200, swapsAcceptDeclineStub);

    nock("http://localhost:8000")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .reply(200, acceptedStub);

    const actionExecutor = new ActionExecutor(
      config,
      datastore,
      getLedgerExecutorThrowsOnAll()
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

  it("should get actions and fund", done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003")
      .reply(200, swapsWithFundStub);

    nock("http://localhost:8000")
      .get("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/fund")
      .reply(200, fundEtherStub);

    nock("http://localhost:8545")
      .post("/", {
        jsonrpc: "2.0",
        id: 0,
        method: "eth_getTransactionCount",
        params: ["0x1fed25f1780b9e5b8d74279535fdec4f7fb93b13", "latest"]
      })
      .reply(200, { jsonrpc: "2.0", result: "0x0", id: 0 });

    nock("http://localhost:8545")
      .post("/", body => console.log(body))
      .reply(200);

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
        () => {
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
