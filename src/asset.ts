import Big from "big.js";
import Ledger from "./ledger";
import { getLogger } from "./logging/logger";

const logger = getLogger();

class Asset {
  public static bitcoin = new Asset("bitcoin", Ledger.Bitcoin);
  public static ether = new Asset("ether", Ledger.Ethereum);

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
}
export function toAssetFromName(name: string): Asset | undefined {
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
export function toAsset(
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
      logger.crit(`Asset not supported: ${asset}`);
      return undefined;
  }
}

export default Asset;

// TODO: This should be a method
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
      return toNominalUnitForToken(asset, quantity);
    }
  }
}

// TODO: This should be a method
function toNominalUnitForToken(asset: Asset, quantity: Big) {
  if (asset.decimals) {
    return quantity.div(new Big(10).pow(asset.decimals));
  }
  logger.crit("Unit conversion not supported for", asset);
  return undefined;
}
