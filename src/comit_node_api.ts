import { Action, Entity } from "../gen/siren";
import request from "request-promise-native";
import {from, Observable} from "rxjs";
import {map} from "rxjs/operators";

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
  public getSwaps = (): Observable<Entity[]> => {

    const options = {
      method: 'GET',
      url: 'http://localhost:8000/swaps/rfc003/',
      json: true,
    };

    return from(request(options))
        .pipe(map(response => response.entities));
  }
}
