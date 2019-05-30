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

const bitcoinWallet = InternalBitcoinWallet.fromConfig(
  // @ts-ignore
  config.bitcoinConfig,
  // @ts-ignore
  config.bitcoinBlockchain,
  config.seed,
  0
);
const ethereumWallet = EthereumWallet.fromConfig(
  // @ts-ignore: config.ethereumConfig is expected to exist
  config.ethereumConfig,
  config.seed,
  1
);
const ledgerExecutorParams = {};

let bitcoinFeeService = BitcoinFeeService.default();
let ethereumFeeService = EthereumGasPriceService.default();

if (config.bitcoinConfig) {
  const bitcoinBlockchain = BitcoinCoreRpc.fromConfig(config.bitcoinConfig);
  const bitcoinWallet = InternalBitcoinWallet.fromConfig(
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
  ethereumFeeService = new EthereumGasPriceService(
    config.ethereumConfig.fee.defaultFee,
    config.ethereumConfig.fee.strategy
  );
  Object.assign(ledgerExecutorParams, { ethereumWallet, ethereumFeeService });
}

const datastore = new InternalDatastore({
  bitcoinWallet,
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
      .map(actions => {
        return actions.then(actions => {
          log(`Selected actions: ${JSON.stringify(actions)}`);
          return actions.map(action => actionExecutor.execute(action));
        });
      })
      .forEach(actionResponse => {
        log(`Action response: ${JSON.stringify(actionResponse)}`);
      });
  });

setInterval(() => {
  shoot().then(() => log("Execution done"));
}, 10000);
