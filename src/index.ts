import debug from "debug";
import { from, timer } from "rxjs";
import { filter, flatMap, map, tap } from "rxjs/operators";
import { ActionExecutor } from "./actionExecutor";
import poll from "./actionPoller";
import { ActionSelector } from "./actionSelector";
import { BitcoinCoreRpc } from "./bitcoin/bitcoinCoreRpc";
import { ComitNode } from "./comitNode";
import { Config } from "./config";
import { Datastore } from "./datastore";
import { LedgerExecutor, Ledgers } from "./ledgerExecutor";
import { BitcoinWallet } from "./wallets/bitcoin";
import { EthereumWallet } from "./wallets/ethereum";
import { Wallets } from "./wallets/wallets";

const log = debug("bobtimus:index");

const config = Config.fromFile("./config.toml");
const comitNode = new ComitNode(config);
// TODO: switch case to select correct Bitcoin backend
// Probably to be done by a helper function in bitcoin/blockchain.ts

const wallets: Wallets = {};
const ledgers: Ledgers = {};

if (config.bitcoinConfig) {
  const bitcoinBlockchain = BitcoinCoreRpc.fromConfig(config.bitcoinConfig);
  const bitcoinWallet = BitcoinWallet.fromConfig(
    config.bitcoinConfig,
    bitcoinBlockchain,
    config.seed,
    0
  );
  Object.assign(wallets, { bitcoinWallet });
  Object.assign(ledgers, { bitcoinBlockchain });
}

if (config.ethereumConfig) {
  const ethereumWallet = EthereumWallet.fromConfig(
    config.ethereumConfig,
    config.seed,
    1
  );
  Object.assign(wallets, { ethereumWallet });
}

const datastore = new Datastore(wallets);
const ledgerExecutor = new LedgerExecutor(wallets, ledgers);
const actionSelector = new ActionSelector(config);
const actionExecutor = new ActionExecutor(config, datastore, ledgerExecutor);

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
