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
  const {
    bitcoinFeeService,
    bitcoinBlockchain,
    bitcoinWallet
  } = await initBitcoin(config);
  const ethereumParams = await initEthereum(config);

  const ledgerExecutorParams = {
    bitcoinFeeService,
    bitcoinBlockchain,
    bitcoinWallet,
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

  const shoot = async () => {
    const swaps = await comitNode.getSwaps();
    log(`Found ${swaps.length} swap(s)`);

    for (const swap of swaps) {
      const id = swap.properties ? swap.properties.id : undefined;
      try {
        const selectedAction = await actionSelector.selectActions(swap);
        if (selectedAction) {
          log(
            `Selected action for swap ${id}: ${JSON.stringify(selectedAction)}`
          );
          const executionResult = await actionExecutor.execute(selectedAction);
          log(
            `Action execution response for swap ${id}: ${JSON.stringify(
              executionResult
            )}`
          );
          if (executionResult.isErr()) {
            log(`Execution failed, invalidating Action ${selectedAction}`);
            actionSelector.invalidateAction(selectedAction);
          }
        } else {
          log(`No action returned for swap ${id}`);
        }
      } catch (err) {
        log(
          `Error has occurred for swap ${id}. Error is: ${JSON.stringify(err)}`
        );
      }
    }
  };

  setInterval(() => {
    shoot().then(() => log("Execution done"));
  }, 10000);

  if (bitcoinWallet) {
    await bitcoinWallet.refreshUtxo();
    setInterval(() => {
      bitcoinWallet.refreshUtxo();
    }, 60000);
  }
})();
