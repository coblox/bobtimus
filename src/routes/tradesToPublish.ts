import { Request } from "express";
import { Response } from "express";
import { getLogger } from "log4js";
import { BitcoinConfig } from "../config";
import Ledger from "../ledger";
import { Trade, TradeService } from "../rates/tradeService";
import { EthereumWallet } from "../wallets/ethereum";

const logger = getLogger();

const previousTradesLookup: Map<string, Trade> = new Map<string, Trade>();

export function getAmountsToPublishRoute(
  tradeService: TradeService,
  bitcoinConfig: BitcoinConfig,
  ethereumWallet: EthereumWallet,
  peerId: string
) {
  // @ts-ignore
  return async (req: Request, res: Response) => {
    try {
      const trades = await tradeService.prepareTradesToPublish();

      if (!bitcoinConfig) {
        throw new Error("Bitcoin not configured correctly.");
      }
      if (!ethereumWallet) {
        throw new Error("Ethereum not configured correctly");
      }

      const publishTradesResponse = {
        peerId,
        ledgers: [
          {
            name: Ledger.Bitcoin,
            network: bitcoinConfig.network
          },
          {
            name: Ledger.Ethereum,
            network: ethereumWallet.getChainId() === 17 ? "regtest" : "testnet" // TODO: refactor Ethereum ChainId handling in bobtimus
          }
        ],
        rates: trades.map(trade => {
          return {
            timestamp: getTradeTimestamp(trade),
            protocol: trade.protocol,
            buy: {
              ledger: trade.buy.ledger,
              asset: trade.buy.asset,
              quantity: trade.buy.quantity.toString()
            },
            sell: {
              ledger: trade.sell.ledger,
              asset: trade.sell.asset,
              quantity: trade.sell.quantity.toString()
            }
          };
        })
      };

      res.send(publishTradesResponse);
    } catch (e) {
      logger.error(`Error when requesting trades to publish: ${e.message}`);
      res.status(500);
      res.send({ error: e.message });
    }
  };
}

function getTradeTimestamp(current: Trade): string {
  const key =
    current.buy.ledger +
    current.buy.asset +
    current.sell.ledger +
    current.sell.asset;

  const previous = previousTradesLookup.get(key);
  if (!previous) {
    previousTradesLookup.set(key, current);
    return formatTimestamp(current.timestamp);
  }

  if (
    current.sell.quantity.eq(previous.sell.quantity) &&
    current.buy.quantity.eq(previous.buy.quantity)
  ) {
    return formatTimestamp(previous.timestamp);
  }

  previousTradesLookup.set(key, current);
  return formatTimestamp(current.timestamp);
}

function formatTimestamp(timestamp: Date | undefined): string {
  return timestamp ? timestamp.toUTCString() : new Date().toUTCString();
}
