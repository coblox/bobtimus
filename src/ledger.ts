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
      return undefined;
  }
}

export default Ledger;
