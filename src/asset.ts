import Big from "big.js";
import { getLogger } from "log4js";

const logger = getLogger();

enum Asset {
  Bitcoin = "bitcoin",
  Ether = "ether"
}

export function toAsset(asset: string) {
  switch (asset) {
    case Asset.Bitcoin:
      return Asset.Bitcoin;
    case Asset.Ether:
      return Asset.Ether;
    default:
      logger.error(`Asset not supported: ${asset}`);
      return undefined;
  }
}

export default Asset;

export function toNominalUnit(asset: Asset, quantity: Big) {
  switch (asset) {
    case Asset.Bitcoin: {
      const sats = new Big(quantity);
      const satsInBitcoin = new Big("100000000");
      return sats.div(satsInBitcoin);
    }
    case Asset.Ether: {
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
