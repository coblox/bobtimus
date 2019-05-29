import debug from "debug";
import { from, timer } from "rxjs";
import { filter, flatMap, map, tap } from "rxjs/operators";
import { ActionExecutor } from "./actionExecutor";
import poll from "./actionPoller";
import { ActionSelector } from "./actionSelector";
import { BitcoinCoreRpc } from "./bitcoin/bitcoinCoreRpc";
import { BitcoinFeeService } from "./bitcoin/bitcoinFeeService";
import { ComitNode } from "./comitNode";
import { Config } from "./config";
import { Datastore } from "./datastore";
import { EthereumFeeService } from "./ethereum/ethereumFeeService";
import { LedgerExecutor } from "./ledgerExecutor";
import { BitcoinWallet } from "./wallets/bitcoin";
import { EthereumWallet } from "./wallets/ethereum";

const log = debug("bobtimus:index");

const config = Config.fromFile("./config.toml");
const comitNode = new ComitNode(config);
// TODO: switch case to select correct Bitcoin backend
// Probably to be done by a helper function in bitcoin/blockchain.ts

const wallets = {};
const ledgerExecutorParams = {};

let bitcoinFeeService = BitcoinFeeService.default();
let ethereumFeeService = EthereumFeeService.default();

if (config.bitcoinConfig) {
  const bitcoinBlockchain = BitcoinCoreRpc.fromConfig(config.bitcoinConfig);
  const bitcoinWallet = BitcoinWallet.fromConfig(
    config.bitcoinConfig,
    bitcoinBlockchain,
    config.seed,
    0
  );
  bitcoinFeeService = new BitcoinFeeService(
    config.bitcoinConfig.fee.defaultFee,
    config.bitcoinConfig.fee.strategy
  );
  Object.assign(ledgerExecutorParams, {
    bitcoinFeeService,
    bitcoinBlockchain,
    bitcoinWallet
  });
}

if (config.ethereumConfig) {
  const ethereumWallet = EthereumWallet.fromConfig(
    config.ethereumConfig,
    config.seed,
    1
  );
  ethereumFeeService = new EthereumFeeService(
    config.ethereumConfig.fee.defaultFee,
    config.ethereumConfig.fee.strategy
  );
  Object.assign(ledgerExecutorParams, { ethereumWallet, ethereumFeeService });
}

const datastore = new Datastore(wallets);
const ledgerExecutor = new LedgerExecutor(ledgerExecutorParams);
const actionSelector = new ActionSelector(config);
const actionExecutor = new ActionExecutor(comitNode, datastore, ledgerExecutor);

poll(comitNode, timer(0, 500))
  .pipe(map(swap => actionSelector.selectAction(swap)))
  .pipe(tap(result => log("Result:", result)))
  .pipe(filter(result => result.isOk))
  .pipe(map(actionResult => actionResult.unwrap()))
  .pipe(map(action => actionExecutor.execute(action)))
  .pipe(flatMap(actionResponse => from(actionResponse)))
  .subscribe(
    swap => log("success: " + swap),
    error => log("error: " + error),
    () => log("done")
  );
