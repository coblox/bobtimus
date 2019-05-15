export interface Utxo {
  txId: string;
  vout: number;
  satAmount: number; // Satoshis
}

export interface BitcoinBlockchain {
  broadcastTransaction(transaction: string): Promise<string>;

  /// Find the outputs for addresses generated with BIP32
  /// Using path m/0'/0'/k' and m/0'/1'/k'
  findHdOutputs(extendedPrivateKey: string): Promise<Utxo[]>;

  getOutputAddressFromTxId(txId: string, vout: number): Promise<string>;
}
