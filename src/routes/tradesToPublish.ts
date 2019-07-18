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
  peerId: string,
  addressHint?: string
) {
  // @ts-ignore
  return async (req: Request, res: Response) => {
    try {
      if (!bitcoinConfig) {
        throw new Error("Bitcoin not configured correctly.");
      }
      if (!ethereumWallet) {
        throw new Error("Ethereum not configured correctly");
      }

      const trades = await tradeService.prepareTradesToPublish();

      const publishTradesResponse = {
        peerId,
        addressHint,
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
            timestamp: formatTimestamp(findLatestTradeTimestamp(trade)),
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

export function findLatestTradeTimestamp(current: Trade): Date {
  const key =
    current.buy.ledger +
    current.buy.asset +
    current.sell.ledger +
    current.sell.asset;

  const previous = previousTradesLookup.get(key);
  if (!previous) {
    previousTradesLookup.set(key, current);
    return current.timestamp;
  }

  if (
    current.sell.quantity.eq(previous.sell.quantity) &&
    current.buy.quantity.eq(previous.buy.quantity)
  ) {
    return previous.timestamp;
  }

  if (previous.timestamp.getTime() > current.timestamp.getTime()) {
    return previous.timestamp;
  }

  previousTradesLookup.set(key, current);
  return current.timestamp;
}

function formatTimestamp(timestamp: Date): string {
  return timestamp.toISOString();
}
