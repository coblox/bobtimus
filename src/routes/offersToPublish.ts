import { Request } from "express";
import { Response } from "express";
import Asset from "../asset";
import { BitcoinConfig } from "../config";
import Ledger from "../ledger";
import { getLogger } from "../logging/logger";
import { Offer, TradeService } from "../rates/tradeService";
import { EthereumWallet } from "../wallets/ethereum";

const logger = getLogger();

const previousTradesLookup: Map<string, Offer> = new Map<string, Offer>();

export interface LedgerToPublish {
  name: string;
  network: string;
}

export interface ContractToPublish {
  address: string;
  decimals: number;
}

export interface OffersToPublish {
  buy: {
    asset: string;
    ledger: string;
    quantity: string;
    contract?: ContractToPublish;
  };
  protocol: string;
  sell: {
    asset: string;
    ledger: string;
    quantity: string;
    contract?: ContractToPublish;
  };
  timestamp: string;
}

export interface ToPublish {
  peerId: string;
  addressHint: string | undefined;
  ledgers: LedgerToPublish[];
  rates: OffersToPublish[];
}

function contractToPublish(asset: Asset): ContractToPublish | undefined {
  if (asset.contract) {
    const contract = asset.contract;
    return {
      address: contract.address,
      decimals: contract.decimals
    };
  }
  return undefined;
}

export function getOffersToPublishRoute(
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
      const trades = await tradeService.prepareOffersToPublish();
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
            timestamp: formatTimestamp(findLatestOfferTimestamp(trade)),
            protocol: trade.protocol,
            buy: {
              ledger: trade.buy.ledger,
              asset: trade.buy.asset.name,
              quantity: trade.buy.quantity.toString(),
              contract: contractToPublish(trade.buy.asset)
            },
            sell: {
              ledger: trade.sell.ledger,
              asset: trade.sell.asset.name,
              quantity: trade.sell.quantity.toString(),
              contract: contractToPublish(trade.sell.asset)
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

export function findLatestOfferTimestamp(current: Offer): Date {
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
