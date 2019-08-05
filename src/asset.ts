import Big from "big.js";
import { getLogger } from "log4js";
import Ledger from "./ledger";

const logger = getLogger();

class Asset {
  public static bitcoin = new Asset("bitcoin", Ledger.Bitcoin);
  public static ether = new Asset("ether", Ledger.Ethereum);

  public ledger: Ledger;
  public name: string;
  public contract?: string;

  public constructor(name: string, ledger: Ledger, contract?: string) {
    this.name = name;
    this.ledger = ledger;
    this.contract = contract;
  }
}
export function toAssetFromName(name: string): Asset | undefined {
  return toAsset({ name });
}

export function toAsset(asset: any): Asset | undefined {
  if (!asset.name) {
    return undefined;
  }
  switch (asset.name) {
    case Asset.bitcoin.name:
      return Asset.bitcoin;
    case Asset.ether.name:
      return Asset.ether;
    default:
      logger.error(`Asset not supported: ${asset}`);
      return undefined;
  }
}

export default Asset;

export function toNominalUnit(asset: Asset, quantity: Big) {
  switch (asset) {
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
      logger.error(`Unit conversion not supported for ${asset}`);
      return undefined;
    }
  }
}
