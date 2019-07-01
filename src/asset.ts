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
      return undefined;
  }
}

export default Asset;
