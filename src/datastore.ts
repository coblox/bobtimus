import { Field } from "../gen/siren";
import { BitcoinFeeService } from "./bitcoin/bitcoinFeeService";
import { IBitcoinWallet } from "./wallets/bitcoin";
import { EthereumWallet } from "./wallets/ethereum";

export interface IDatastore {
  getData: (field: Field) => any;
}

export interface DatastoreParameters {
  ethereumWallet?: EthereumWallet;
  bitcoinWallet?: IBitcoinWallet;
  bitcoinFeeService?: BitcoinFeeService;
}

export class Datastore implements IDatastore {
  private readonly ethereumWallet?: EthereumWallet;
  private readonly bitcoinWallet?: IBitcoinWallet;
  private readonly bitcoinFeeService?: BitcoinFeeService;

  constructor({
    ethereumWallet,
    bitcoinWallet,
    bitcoinFeeService
  }: DatastoreParameters) {
    this.ethereumWallet = ethereumWallet;
    this.bitcoinWallet = bitcoinWallet;
    this.bitcoinFeeService = bitcoinFeeService;
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

    if (
      this.bitcoinFeeService &&
      field.class.includes("bitcoin") &&
      field.class.includes("feePerByte")
    ) {
      return await this.bitcoinFeeService.retrieveSatsPerByte();
    }
  }
}
