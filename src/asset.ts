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
