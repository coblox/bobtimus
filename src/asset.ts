import Big from "big.js";
import Ledger from "./ledger";
import { getLogger } from "./logging/logger";

const logger = getLogger();

class Asset {
  public static bitcoin = new Asset("bitcoin", Ledger.Bitcoin);
  public static ether = new Asset("ether", Ledger.Ethereum);

  public static fromName(name: string): Asset | undefined {
    switch (name) {
      case Asset.bitcoin.name:
        return Asset.bitcoin;
      case Asset.ether.name:
        return Asset.ether;
      default:
        logger.crit(`Asset not supported: ${name}`);
        return undefined;
    }
  }

  // TODO: See if the ledger argument can be avoided
  public static fromComitPayload(
    asset: any,
    ledger: Ledger,
    createAssetFromTokens: (
      ledger: Ledger,
      contractAddress: string
    ) => Asset | undefined
  ): Asset | undefined {
    if (!asset.name) {
      return undefined;
    }
    switch (asset.name) {
      case Asset.bitcoin.name:
        return Asset.bitcoin;
      case Asset.ether.name:
        return Asset.ether;
      default:
        if (createAssetFromTokens && ledger && asset.token_contract) {
          return createAssetFromTokens(ledger, asset.token_contract);
        }
        logger.crit(`Asset not supported`, asset);
        return undefined;
    }
  }

  public ledger: Ledger;
  public name: string;
  public contract?: string;
  public decimals?: number;

  public constructor(
    name: string,
    ledger: Ledger,
    contract?: string,
    decimals?: number
  ) {
    this.name = name;
    this.ledger = ledger;
    this.contract = contract;
    this.decimals = decimals;
  }

  public toNominalUnit(quantity: Big) {
    switch (this) {
      case Asset.bitcoin: {
        const sats = new Big(quantity);
        const satsInBitcoin = new Big("100000000");
        return sats.div(satsInBitcoin);
      }
      case Asset.ether: {
        const wei = new Big(quantity);
        const weiInEther = new Big("1000000000000000000");
        return wei.div(weiInEther);
      }
      default: {
        return this.toNominalUnitForToken(quantity);
      }
    }
  }

  private toNominalUnitForToken(quantity: Big) {
    if (this.decimals) {
      return quantity.div(new Big(10).pow(this.decimals));
    }
    logger.crit("Unit conversion not supported for", this);
    return undefined;
  }
}

export default Asset;
