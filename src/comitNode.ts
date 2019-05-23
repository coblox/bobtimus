import Big from "big.js";
import request from "request-promise-native";
import { from, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Action, Entity } from "../gen/siren";
import { Config } from "./config";

interface Ledger {
  name: string;
  network: string;
}

interface Asset {
  name: string;
  quantity: string;
}

export interface Swap {
  properties: {
    role: string;
    protocol: string;
    status: string;
    parameters: {
      alpha_ledger: Ledger;
      alpha_asset: Asset;
      beta_ledger: Ledger;
      beta_asset: Asset;
    };
  };
  actions: Action[];
}

export class ComitNode {
  public config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  public getSwaps = (): Observable<Entity[]> => {
    const options = {
      method: "GET",
      url: this.config.prependUrlIfNeeded("/swaps/rfc003").toString(),
      json: true
    };

    return from(request(options)).pipe(map(response => response.entities));
  };
}

export function toNominalUnit(asset: Asset) {
  switch (asset.name) {
    case "bitcoin": {
      const sats = new Big(asset.quantity);
      const satsInBitcoin = new Big("100000000");
      return sats.div(satsInBitcoin);
    }
    case "ether": {
      const wei = new Big(asset.quantity);
      const weiInEther = new Big("1000000000000000000");
      return wei.div(weiInEther);
    }
    default: {
      return undefined;
    }
  }
}
