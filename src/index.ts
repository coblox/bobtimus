import debug from "debug";
import { ActionExecutor } from "./actionExecutor";
import { ActionSelector } from "./actionSelector";
import { BitcoinCoreRpc } from "./bitcoin/bitcoinCoreRpc";
import { BitcoinFeeService } from "./bitcoin/bitcoinFeeService";
import { ComitNode } from "./comitNode";
import { Config } from "./config";
import { EthereumGasPriceService } from "./ethereum/ethereumGasPriceService";
import { DefaultFieldDataSource } from "./fieldDataSource";
import { LedgerExecutor } from "./ledgerExecutor";
import { InternalBitcoinWallet } from "./wallets/bitcoin";
import { Web3EthereumWallet } from "./wallets/ethereum";

const log = debug("bobtimus:index");

const initBitcoin = async (config: Config) => {
  if (!config.bitcoinConfig) {
    return {
      bitcoinFeeService: BitcoinFeeService.default()
    };
  }

  const bitcoinBlockchain = BitcoinCoreRpc.fromConfig(config.bitcoinConfig);
  const bitcoinWallet = InternalBitcoinWallet.fromConfig(
    config.bitcoinConfig,
    bitcoinBlockchain,
    config.seed,
    0
  );
  const bitcoinFeeService = new BitcoinFeeService(
    config.bitcoinConfig.fee.defaultFee,
    config.bitcoinConfig.fee.strategy
  );
  log(`Please fund bobtimus btc account: ${bitcoinWallet.getNewAddress()}`);

  return {
    bitcoinFeeService,
    bitcoinBlockchain,
    bitcoinWallet
  };
};

const initEthereum = async (config: Config) => {
  if (!config.ethereumConfig) {
    return {
      ethereumFeeService: EthereumGasPriceService.default()
    };
  }

  const ethereumWallet = await Web3EthereumWallet.fromConfig(
    config.ethereumConfig,
    config.seed,
    1
  );
  const ethereumFeeService = new EthereumGasPriceService(
    config.ethereumConfig.fee.defaultFee,
    config.ethereumConfig.fee.strategy
  );
  log(`Please fund bobtimus eth account: ${ethereumWallet.getAddress()}`);
  return { ethereumWallet, ethereumFeeService };
};

const config = Config.fromFile("./config.toml");

(async () => {
  const bitcoinParams = await initBitcoin(config);
  const ethereumParams = await initEthereum(config);

  const ledgerExecutorParams = {
    ...bitcoinParams,
    ...ethereumParams
  };

  const comitNode = new ComitNode(config);
  const datastore = new DefaultFieldDataSource(ledgerExecutorParams);
  const ledgerExecutor = new LedgerExecutor(ledgerExecutorParams);
  const actionSelector = new ActionSelector(config);

  const actionExecutor = new ActionExecutor(
    comitNode,
    datastore,
    ledgerExecutor
  );

  const shoot = () =>
    comitNode.getSwaps().then(swaps => {
      log(`Found swaps: ${JSON.stringify(swaps)}`);
      return swaps
        .map(swap => actionSelector.selectActions(swap))
        .map(action => {
          if (action) {
            log(`Selected action: ${JSON.stringify(action)}`);
            return actionExecutor.execute(action);
          } else {
            log("No action returned");
            return undefined;
          }
        })
        .forEach(actionResponse => {
          log(`Action response: ${JSON.stringify(actionResponse)}`);
        });
    });

  setInterval(() => {
    shoot().then(() => log("Execution done"));
  }, 10000);
})();
