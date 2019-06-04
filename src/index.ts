import debug from "debug";
import { ActionExecutor } from "./actionExecutor";
import { ActionSelector } from "./actionSelector";
import { BitcoinCoreRpc } from "./bitcoin/bitcoinCoreRpc";
import { BitcoinFeeService } from "./bitcoin/bitcoinFeeService";
import { ComitNode } from "./comitNode";
import { Config } from "./config";
import { InternalDatastore } from "./datastore";
import { EthereumGasPriceService } from "./ethereum/ethereumGasPriceService";
import { LedgerExecutor } from "./ledgerExecutor";
import { InternalBitcoinWallet } from "./wallets/bitcoin";
import { EthereumWallet } from "./wallets/ethereum";

const log = debug("bobtimus:index");

const config = Config.fromFile("./config.toml");
const comitNode = new ComitNode(config);
// TODO: switch case to select correct Bitcoin backend
// Probably to be done by a helper function in bitcoin/blockchain.ts

const ledgerExecutorParams = {};

let bitcoinFeeService = BitcoinFeeService.default();
let ethereumFeeService = EthereumGasPriceService.default();

let bitcoinWallet;
let ethereumWallet;

if (config.bitcoinConfig) {
  const bitcoinBlockchain = BitcoinCoreRpc.fromConfig(config.bitcoinConfig);
  bitcoinWallet = InternalBitcoinWallet.fromConfig(
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
  log(`Please fund bobtimus btc account: ${bitcoinWallet.getNewAddress()}`);
}

if (config.ethereumConfig) {
  ethereumWallet = EthereumWallet.fromConfig(
    config.ethereumConfig,
    config.seed,
    1
  );
  ethereumFeeService = new EthereumGasPriceService(
    config.ethereumConfig.fee.defaultFee,
    config.ethereumConfig.fee.strategy
  );
  Object.assign(ledgerExecutorParams, { ethereumWallet, ethereumFeeService });
  log(`Please fund bobtimus eth account: ${ethereumWallet.getAddress()}`);
}

const datastore = new InternalDatastore({
  // @ts-ignore
  bitcoinWallet,
  // @ts-ignore
  ethereumWallet,
  bitcoinFeeService
});
const ledgerExecutor = new LedgerExecutor(ledgerExecutorParams);
const actionSelector = new ActionSelector(config);
const actionExecutor = new ActionExecutor(comitNode, datastore, ledgerExecutor);

const shoot = () =>
  comitNode.getSwaps().then(swaps => {
    log(`Found swaps: ${JSON.stringify(swaps)}`);
    return swaps
      .map(swap => actionSelector.selectActions(swap))
      .map(selectedAction => {
        return selectedAction.then(action => {
          if (action) {
            log(`Selected action: ${JSON.stringify(action)}`);
            return actionExecutor.execute(action);
          } else {
            log("No action returned");
            return undefined;
          }
        });
      })
      .forEach(actionResponse => {
        log(`Action response: ${JSON.stringify(actionResponse)}`);
      });
  });

setInterval(() => {
  shoot().then(() => log("Execution done"));
}, 10000);
