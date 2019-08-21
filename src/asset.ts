import Big from "big.js";
import Ledger from "./ledger";
import { getLogger } from "./logging/logger";

const logger = getLogger();

export interface ContractDetails {
  address: string;
  decimals: number;
}

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
        logger.error(`Asset not supported: ${name}`);
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
        logger.error(`Asset not supported`, asset);
        return undefined;
    }
  }

  public ledger: Ledger;
  public name: string;
  public contract?: ContractDetails;

  public constructor(name: string, ledger: Ledger, contract?: ContractDetails) {
    this.name = name;
    this.ledger = ledger;
    this.contract = contract;
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

  public toMapKey(): string {
    return JSON.stringify(this);
  }

  private toNominalUnitForToken(quantity: Big) {
    if (this.contract) {
      return quantity.div(new Big(10).pow(this.contract.decimals));
    }
    logger.error("Unit conversion not supported for", this);
    return undefined;
  }
}

export default Asset;
