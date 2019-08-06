import express = require("express");
import { configure, getLogger } from "log4js";
import { ActionExecutor } from "./actionExecutor";
import { ActionSelector } from "./actionSelector";
import { BitcoinCoreRpc } from "./bitcoin/bitcoinCoreRpc";
import { BitcoinFeeService } from "./bitcoin/bitcoinFeeService";
import { ComitNode } from "./comitNode";
import { Config } from "./config";
import { EthereumGasPriceService } from "./ethereum/ethereumGasPriceService";
import { DefaultFieldDataSource } from "./fieldDataSource";
import { LedgerExecutor } from "./ledgerExecutor";
import { createTradeEvaluationService } from "./rates/tradeService";
import { getAmountsToPublishRoute } from "./routes/tradesToPublish";
import Tokens from "./tokens";
import { InternalBitcoinWallet } from "./wallets/bitcoin";
import { Web3EthereumWallet } from "./wallets/ethereum";

const CONFIG_PATH = "./config.toml";
const LOG_CONFIG_PATH = "./logconfig.json";
const TOKENS_CONFIG_PATH = "./tokens.toml";

const logger = getLogger();
const pollIntervalMillis = 10000;
configure(LOG_CONFIG_PATH);

const api = express();

const refreshUtxos = async (bitcoinWallet: InternalBitcoinWallet) => {
  try {
    await bitcoinWallet.refreshUtxo();
  } catch (e) {
    logger.error("Failed to refresh UTXO:", e.message);
    console.log(e.message);
  }
};

const initBitcoin = async (config: Config) => {
  if (!config.bitcoinConfig) {
    return {
      bitcoinFeeService: BitcoinFeeService.default()
    };
  }

  if (!config.bitcoinConfig.coreRpc) {
    logger.warn(
      "Bitcoin config is specified without connection details to a bitcoin node"
    );
    return {
      bitcoinFeeService: BitcoinFeeService.default()
    };
  }

  const bitcoinBlockchain = BitcoinCoreRpc.fromConfig(
    config.bitcoinConfig.coreRpc
  );
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
  console.log(
    `Please fund bobtimus btc account: ${bitcoinWallet.getNewAddress()}`
  );

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
  console.log(
    `Please fund bobtimus eth account: ${ethereumWallet.getAddress()}`
  );
  return { ethereumWallet, ethereumFeeService };
};

const config = Config.fromFile(CONFIG_PATH);

(async () => {
  const {
    bitcoinFeeService,
    bitcoinBlockchain,
    bitcoinWallet
  } = await initBitcoin(config);
  const ethereumParams = await initEthereum(config);

  const tradeService = await createTradeEvaluationService({
    testnetMarketMaker: config.testnetMarketMaker,
    staticRates: config.staticRates,
    lowBalanceThresholdPercentage: config.lowBalanceThresholdPercentage,
    ethereumWallet: ethereumParams.ethereumWallet,
    bitcoinWallet
  });

  const ledgerExecutorParams = {
    bitcoinFeeService,
    bitcoinBlockchain,
    bitcoinWallet,
    ...ethereumParams
  };

  const comitNode = new ComitNode(config.cndUrl);
  const datastore = new DefaultFieldDataSource(ledgerExecutorParams);
  const ledgerExecutor = new LedgerExecutor(ledgerExecutorParams);
  const tokens = Tokens.fromFile(TOKENS_CONFIG_PATH);
  let createAssetFromTokens;
  if (tokens) {
    createAssetFromTokens = tokens.createAsset;
  }
  const actionSelector = new ActionSelector(
    config.getSupportedLedgers(),
    tradeService,
    createAssetFromTokens
  );

  const actionExecutor = new ActionExecutor(
    comitNode,
    datastore,
    ledgerExecutor
  );

  const comitNodeMetadata = await comitNode.getMetadata();
  if (!comitNodeMetadata) {
    throw new Error("Could not retrieve metadata from comit-node");
  }

  if (!config.bitcoinConfig) {
    throw new Error("Bitcoin not initialized correctly");
  }
  if (!ethereumParams.ethereumWallet) {
    throw new Error("Ethereum not initialized correctly");
  }

  api.get(
    "/trades",
    getAmountsToPublishRoute(
      tradeService,
      config.bitcoinConfig,
      ethereumParams.ethereumWallet,
      comitNodeMetadata.id,
      config.cndListenAddress
    )
  );

  const shoot = async () => {
    const swaps = await comitNode.getSwaps();
    logger.trace(`Found ${swaps.length} swap(s)`);

    for (const swap of swaps) {
      const id = swap.properties ? swap.properties.id : undefined;
      try {
        const selectedAction = await actionSelector.selectActions(swap);
        if (selectedAction) {
          logger.trace(
            `Selected action for swap ${id}: ${JSON.stringify(selectedAction)}`
          );
          const executionResult = await actionExecutor.execute(
            selectedAction,
            config.maxRetries
          );
          logger.trace(
            `Action execution response for swap ${id}: ${JSON.stringify(
              executionResult
            )}`
          );
        } else {
          logger.trace(`No action returned for swap ${id}`);
        }
      } catch (err) {
        logger.error(`Error has occurred for swap ${id}`, err);
      }
    }
  };

  setInterval(() => {
    shoot().then(() =>
      logger.trace(
        `Polling new information from comit-node in ${pollIntervalMillis} ms again`
      )
    );
  }, pollIntervalMillis);

  if (bitcoinWallet) {
    refreshUtxos(bitcoinWallet);

    setInterval(async () => {
      await refreshUtxos(bitcoinWallet);
    }, 60000);
  }

  if (config.apiPort) {
    api.listen(config.apiPort, () =>
      console.log(`API exposed at port ${config.apiPort}`)
    );
  } else {
    console.warn("API port not configured - not exposing API");
  }
})();
