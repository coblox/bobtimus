import express = require("express");
import { ActionExecutor } from "./actionExecutor";
import { ActionSelector } from "./actionSelector";
import { BitcoinCoreRpc } from "./bitcoin/bitcoinCoreRpc";
import { BitcoinFeeService } from "./bitcoin/bitcoinFeeService";
import { ComitNode } from "./comitNode";
import { Config } from "./config";
import { EthereumGasPriceService } from "./ethereum/ethereumGasPriceService";
import { DefaultFieldDataSource } from "./fieldDataSource";
import { LedgerExecutor } from "./ledgerExecutor";
import { getLogger } from "./logging/logger";
import { createTradeEvaluationService } from "./rates/tradeService";
import { getOffersToPublishRoute } from "./routes/offersToPublish";
import Tokens from "./tokens";
import { InternalBitcoinWallet } from "./wallets/bitcoin";
import { Web3EthereumWallet } from "./wallets/ethereum";

const CONFIG_PATH = "./config.toml";
const TOKENS_CONFIG_PATH = "./tokens.toml";

const logger = getLogger();
const pollIntervalMillis = 10000;

const api = express();

const refreshUtxos = async (bitcoinWallet: InternalBitcoinWallet) => {
  try {
    await bitcoinWallet.refreshUtxo();
  } catch (e) {
    logger.crit("Failed to refresh UTXO: ", e);
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
  logger.info(
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

  let bitcoinLedgerExecutorParams;
  if (bitcoinBlockchain && bitcoinWallet) {
    bitcoinLedgerExecutorParams = {
      getBlockTime: bitcoinBlockchain.getBlockTime,
      getWalletNetwork: bitcoinWallet.getNetwork,
      broadcastTransaction: bitcoinBlockchain.broadcastTransaction,
      retrieveSatsPerByte: bitcoinFeeService.retrieveSatsPerByte,
      payToAddress: bitcoinWallet.payToAddress
    };
  }

  let ethereumLedgerExecutorParams;
  if (ethereumParams && ethereumParams.ethereumWallet) {
    ethereumLedgerExecutorParams = {
      getWalletChainId: ethereumParams.ethereumWallet.getChainId,
      getLatestBlockTimestamp:
        ethereumParams.ethereumWallet.getLatestBlockTimestamp,
      deployContract: ethereumParams.ethereumWallet.deployContract,
      retrieveGasPrice: ethereumParams.ethereumFeeService.retrieveGasPrice,
      sendTransactionTo: ethereumParams.ethereumWallet.sendTransactionTo
    };
  }

  const ledgerExecutorParams = {
    bitcoinFeeService,
    bitcoinBlockchain,
    bitcoinWallet,
    ...ethereumParams
  };

  const comitNode = new ComitNode(config.cndUrl);
  const datastore = new DefaultFieldDataSource(ledgerExecutorParams);
  const ledgerExecutor = new LedgerExecutor(
    bitcoinLedgerExecutorParams,
    ethereumLedgerExecutorParams
  );
  const tokens = Tokens.fromFile(TOKENS_CONFIG_PATH);
  let createAssetFromTokens;
  if (tokens) {
    createAssetFromTokens = tokens.createAsset;
  }
  const actionSelector = new ActionSelector(
    config.getSupportedLedgers(),
    tradeService.isOfferAcceptable,
    createAssetFromTokens
  );

  const actionExecutor = new ActionExecutor(
    comitNode,
    datastore.getData,
    ledgerExecutor.execute
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
    getOffersToPublishRoute(
      tradeService,
      config.bitcoinConfig,
      ethereumParams.ethereumWallet,
      comitNodeMetadata.id,
      config.cndListenAddress
    )
  );

  const shoot = async () => {
    const swaps = await comitNode.getSwaps();
    logger.log("trace", `Found ${swaps.length} swap(s)`);

    for (const swap of swaps) {
      const id = swap.properties ? swap.properties.id : undefined;
      try {
        const selectedAction = await actionSelector.selectActions(swap);
        if (selectedAction) {
          logger.log("trace", `Selected action for swap ${id}`, selectedAction);
          const executionResult = await actionExecutor.execute(
            selectedAction,
            config.maxRetries
          );
          logger.log(
            "trace",
            `Action execution response for swap ${id}`,
            executionResult
          );
        } else {
          logger.log("trace", `No action returned for swap ${id}`);
        }
      } catch (err) {
        logger.crit(`Error has occurred for swap ${id}`, err);
      }
    }
  };

  setInterval(() => {
    shoot().then(() =>
      logger.log(
        "trace",
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
      logger.info(`API exposed at port ${config.apiPort}`)
    );
  } else {
    logger.info("API port not configured - not exposing API");
  }
})();
