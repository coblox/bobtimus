import request from "request-promise-native";
import { from, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Action, Entity } from "../gen/siren";
import { Config } from "./config";

export function contains(array: any[], value: any) {
  return array.some((e: any) => e === value);
}

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
