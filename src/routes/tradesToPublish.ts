import { Request } from "express";
import { Response } from "express";
import { getLogger } from "log4js";
import { BitcoinConfig } from "../config";
import Ledger from "../ledger";
import { Trade, TradeService } from "../rates/tradeService";
import { EthereumWallet } from "../wallets/ethereum";

const logger = getLogger();

const previousTradesLookup: Map<string, Trade> = new Map<string, Trade>();

export interface LedgerToPublish {
  name: string;
  network: string;
}

export interface RateToPublish {
  buy: {
    asset: string;
    ledger: string;
    quantity: string;
  };
  protocol: string;
  sell: {
    asset: string;
    ledger: string;
    quantity: string;
  };
  timestamp: string;
}

export interface ToPublish {
  peerId: string;
  addressHint: string | undefined;
  ledgers: LedgerToPublish[];
  rates: RateToPublish[];
}

export function getAmountsToPublishRoute(
  tradeService: TradeService,
  bitcoinConfig: BitcoinConfig,
  ethereumWallet: EthereumWallet,
  peerId: string,
  addressHint?: string
) {
  return async (_: Request, res: Response) => {
    const errorHandling = (response: Response, message: string) => {
      logger.error(`Error when requesting trades to publish: ${message}`);
      response.status(500);
      response.send({ error: message });
    };

    if (!bitcoinConfig) {
      errorHandling(res, "Bitcoin not configured correctly.");
      return;
    }
    if (!ethereumWallet) {
      errorHandling(res, "Ethereum not configured correctly");
      return;
    }

    try {
      const trades = await tradeService.prepareTradesToPublish();
      const publishTradesResponse: ToPublish = {
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
              asset: trade.buy.asset.name,
              quantity: trade.buy.quantity.toString()
            },
            sell: {
              ledger: trade.sell.ledger,
              asset: trade.sell.asset.name,
              quantity: trade.sell.quantity.toString()
            }
          };
        })
      };

      res.send(publishTradesResponse);
    } catch (e) {
      errorHandling(res, e.message);
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
