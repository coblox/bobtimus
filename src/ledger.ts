import debug from "debug";

const log = debug("bobtimus::ledger");

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
      log(`Ledger not supported: ${ledger}`);
      return undefined;
  }
}

export default Ledger;
