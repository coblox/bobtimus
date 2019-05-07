import { Action, Entity } from "../gen/siren";
import stubSwapsAcceptDecline from "../stubs/swaps_with_accept_decline.siren.json";

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
  public getSwaps = (): Promise<Entity[]> => {
    const response = stubSwapsAcceptDecline as Entity;
    return Promise.resolve(response.entities || []);
  }
}
