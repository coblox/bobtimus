import {
  BitcoinBlockchain,
  Satoshis,
  Utxo
} from "../../src/bitcoin/blockchain";

export default class MockBitcoinBlockchain implements BitcoinBlockchain {
  public broadcastTransaction(): Promise<string> {
    return Promise.resolve(
      "1111111111111111111111111111111111111111111111111111111111111111"
    );
  }

  public findHdOutputs(): Promise<Utxo[]> {
    return Promise.resolve([
      {
        txId:
          "04273df7e1adff6e1d91707506f1c55f194cb72871e4fbcd405b942ff24a1c08",
        vout: 0,
        scriptPubKey: "00141cd14a66ba2af930bdef5477003f037dea3a9633",
        amount: new Satoshis(75000000),
        height: 201,
        address: "bcrt1qrng55e469tunp00023msq0cr0h4r493ngkzfn5"
      },
      {
        txId:
          "f49c83709d02d01388fcfc087e55e6dbb4c2760974abf0cc97f9c32e53ad7b57",
        vout: 0,
        scriptPubKey: "0014a957c12b3e47503dc5b0013a0d51a03b197aa6ea",
        amount: new Satoshis(42000000),
        address: "bcrt1q49tuz2e7gagrm3dsqyaq65dq8vvh4fh2jh65vn"
      }
    ]);
  }

  public getBlockTime(): Promise<number> {
    return Promise.resolve(42);
  }
}
