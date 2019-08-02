import { getLogger } from "log4js";
import { Field } from "../gen/siren";
import { BitcoinFeeService } from "./bitcoin/bitcoinFeeService";
import { BitcoinWallet } from "./wallets/bitcoin";
import { EthereumWallet } from "./wallets/ethereum";

const logger = getLogger();

export interface DataSourceParameters {
  ethereumWallet?: EthereumWallet;
  bitcoinWallet?: BitcoinWallet;
  bitcoinFeeService?: BitcoinFeeService;
}

export class DefaultFieldDataSource {
  private readonly ethereumWallet?: EthereumWallet;
  private readonly bitcoinWallet?: BitcoinWallet;
  private readonly bitcoinFeeService?: BitcoinFeeService;

  constructor({
    ethereumWallet,
    bitcoinWallet,
    bitcoinFeeService
  }: DataSourceParameters) {
    this.ethereumWallet = ethereumWallet;
    this.bitcoinWallet = bitcoinWallet;
    this.bitcoinFeeService = bitcoinFeeService;
  }

  public async getData(field: Field) {
    logger.trace(`Trying to find data for ${JSON.stringify(field)}`);
    if (
      this.ethereumWallet &&
      field.class.includes("ethereum") &&
      field.class.includes("address")
    ) {
      return this.ethereumWallet.getAddress();
    }

    if (
      this.bitcoinWallet &&
      field.class.includes("bitcoin") &&
      field.class.includes("address")
    ) {
      return this.bitcoinWallet.getNewAddress();
    }

    if (
      this.bitcoinFeeService &&
      field.class.includes("bitcoin") &&
      field.class.includes("feePerByte")
    ) {
      return this.bitcoinFeeService.retrieveSatsPerByte();
    }
    logger.warn(`Could not find data for ${JSON.stringify(field)}`);
  }
}
