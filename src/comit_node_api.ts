import { Action, Entity } from "../gen/siren";
import stubSwapsAcceptDecline from "../stubs/swaps_with_accept_decline.siren.json";

interface Asset {
  name: string;
  quantity: string; // Convert to BN here?
}

export interface Swap extends Entity {
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
  public getSwaps = (): Swap[] => {
    const response = stubSwapsAcceptDecline as Entity;

    if (response.entities) {
      const entities: any = response.entities;
      return entities as Swap[];
    }
    return [];
  }
}
