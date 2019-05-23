import { Field } from "../gen/siren";
import { BitcoinWallet } from "./wallets/bitcoin";
import { EthereumWallet } from "./wallets/ethereum";
import { Wallets } from "./wallets/wallets";

export interface IDatastore {
  getData: (field: Field) => any;
}

// TODO: test this
export class Datastore implements IDatastore {
  private readonly ethereumWallet?: EthereumWallet;
  private readonly bitcoinWallet?: BitcoinWallet;

  constructor({ ethereumWallet, bitcoinWallet }: Wallets) {
    this.ethereumWallet = ethereumWallet;
    this.bitcoinWallet = bitcoinWallet;
  }

  public async getData(field: Field) {
    if (
      this.ethereumWallet &&
      field.class.includes("ethereum") &&
      field.class.includes("address")
    ) {
      return await this.ethereumWallet.getAddress();
    }

    if (
      this.bitcoinWallet &&
      field.class.includes("bitcoin") &&
      field.class.includes("address")
    ) {
      return await this.bitcoinWallet.getNewAddress();
    }
  }
}
