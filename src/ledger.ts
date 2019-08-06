import { getLogger } from "./logging/logger";

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

export default Ledger;
