import { Request } from "express";
import { Response } from "express";
import { getLogger } from "log4js";
import { BitcoinConfig } from "../config";
import Ledger from "../ledger";
import { TradeService } from "../rates/tradeService";
import { EthereumWallet } from "../wallets/ethereum";

const logger = getLogger();

export function getAmountsToPublishRoute(
  tradeService: TradeService,
  bitcoinConfig: BitcoinConfig,
  ethereumWallet: EthereumWallet,
  peerId: string,
  timestamp?: Date
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
            timestamp: timestamp ? timestamp : trade.timestamp,
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
