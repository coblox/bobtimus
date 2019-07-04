import debug from "debug";

const log = debug("bobtimus::asset");

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
      log(`Asset not supported: ${asset}`);
      return undefined;
  }
}

export default Asset;
