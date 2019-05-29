import BN = require("bn.js");
import nock from "nock";
import { from, range } from "rxjs";
import { filter, flatMap, map, tap } from "rxjs/operators";
import { ActionExecutor } from "../../src/actionExecutor";
import poll from "../../src/actionPoller";
import { ActionSelector } from "../../src/actionSelector";
import { BitcoinCoreRpc } from "../../src/bitcoin/bitcoinCoreRpc";
import { BitcoinFeeService } from "../../src/bitcoin/bitcoinFeeService";
import { ComitNode } from "../../src/comitNode";
import { Config } from "../../src/config";
import { InternalDatastore } from "../../src/datastore";
import { EthereumGasPriceService } from "../../src/ethereum/ethereumGasPriceService";
import { LedgerExecutor } from "../../src/ledgerExecutor";
import { InternalBitcoinWallet } from "../../src/wallets/bitcoin";
import { EthereumWallet } from "../../src/wallets/ethereum";
import ethereumGasPriceServiceResponse from "../stubs/ethereumGasPriceService.json";
import ethereumTransactionReceipt from "../stubs/ethereumTransactionReceipt.json";
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
  const bitcoinBlockchain = BitcoinCoreRpc.fromConfig(config.bitcoinConfig);
  const bitcoinWallet = InternalBitcoinWallet.fromConfig(
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
  const datastore = new InternalDatastore({ bitcoinWallet, ethereumWallet });
  const actionSelector = new ActionSelector(config);
  const comitNode = new ComitNode(config);
  const ledgerExecutor = new LedgerExecutor({
    bitcoinWallet,
    ethereumWallet,
    bitcoinBlockchain,
    bitcoinFeeService: BitcoinFeeService.default(),
    ethereumFeeService: EthereumGasPriceService.default()
  });
  const actionExecutor = new ActionExecutor(
    comitNode,
    datastore,
    ledgerExecutor
  );

  it("should get actions and accept", done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003")
      .reply(200, swapsAcceptDeclineStub);

    nock("http://localhost:8000")
      .post("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/accept")
      .reply(200, acceptedStub);

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

  it("should get actions and fund Ether", done => {
    nock("http://localhost:8000")
      .get("/swaps/rfc003")
      .reply(200, swapsWithFundStub);

    nock("http://localhost:8000")
      .get("/swaps/rfc003/399e8ff5-9729-479e-aad8-49b03f8fc5d5/fund")
      .reply(200, fundEtherStub);

    let rpcId = 0;
    nock("http://localhost:8545")
      .post("/", body => {
        rpcId = body.id;
        return body.method === "eth_getTransactionCount";
      })
      .reply(200, { jsonrpc: "2.0", result: "0", id: rpcId });

    nock("https://ethgasstation.info")
      .get("/json/ethgasAPI.json")
      .reply(200, ethereumGasPriceServiceResponse);

    nock("http://localhost:8545")
      .post("/", body => {
        rpcId = body.id;
        return body.method === "eth_sendRawTransaction";
      })
      .reply(200, {
        jsonrpc: "2.0",
        result:
          "0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331",
        id: rpcId
      });

    nock("http://localhost:8545")
      .post("/", body => {
        rpcId = body.id;
        return body.method === "eth_getTransactionReceipt";
      })
      .reply(200, {
        jsonrpc: "2.0",
        result: ethereumTransactionReceipt,
        id: rpcId
      });

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
        res => {
          expect(res.isOk).toBeTruthy();
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
