import { Action, Entity } from "../gen/siren";
import request from "request-promise-native";
import { from, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Config } from "./config";

interface Asset {
  name: string;
  quantity: string; // Convert to BN here?
}

export interface Swap {
  properties: {
    role: string;
    protocol: string;
    status: string;
    parameters: {
      alpha_asset: Asset;
      beta_asset: Asset;
    };
  };
  actions: Action[];
}

export class ComitNode {
  config: Config;

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
