import { getLogger } from "log4js";
import Asset from "./asset";

const logger = getLogger();

enum Ledger {
  Bitcoin = "bitcoin",
  Ethereum = "ethereum"
}

export function toLedger(ledger: string) {
  switch (ledger) {
    case Ledger.Bitcoin:
      return Ledger.Bitcoin;
    case Ledger.Ethereum:
      return Ledger.Ethereum;
    default:
      logger.error(`Ledger not supported: ${ledger}`);
      return undefined;
  }
}

export function forAsset(asset: Asset) {
  switch (asset) {
    case Asset.Bitcoin:
      return Ledger.Bitcoin;
    case Asset.Ether:
      return Ledger.Ethereum;
    default:
      throw new Error(`No ledger configured for asset ${asset}`);
  }
}

export default Ledger;
