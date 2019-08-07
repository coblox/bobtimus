import { Field } from "../gen/siren";
import { BitcoinFeeService } from "./bitcoin/bitcoinFeeService";
import { getLogger } from "./logging/logger";
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
    logger.log("trace", `Trying to find data for field`, field);
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
    logger.warn(`Could not find data for field`, field);
  }
}
