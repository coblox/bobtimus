import {
  Action as SirenAction,
  Entity,
  Field as SirenField,
} from "../gen/siren";
import stubSwapsAcceptDecline from "../stubs/swaps_with_accept_decline.siren.json";

export interface Action extends SirenAction {
  name: "accept" | "decline" | "fund" | "redeem" | "refund";
}

type Class = "swaps" | "swap";

export type FieldClass = "ethereum" | "address";

export interface Field extends SirenField {
  class: FieldClass[];
}

export interface SwapsResponse extends Entity {
  class: Class[];
}

interface Asset {
  name: string;
  quantity: string; // Convert to BN here?
}

export interface Swap extends Entity {
  class: Class[];
  properties: {
    role: "Alice" | "Bob";
    protocol: "rfc003";
    status: "IN_PROGRESS" | "SWAPPED" | "NOT_SWAPPED" | "INTERNAL_FAILURE";
    parameters: {
      alpha_asset: Asset;
      beta_asset: Asset;
    };
  };
  actions: Action[];
}

export class ComitNode {
  public getSwaps = (): Swap[] => {
    const response = stubSwapsAcceptDecline as SwapsResponse;

    if (response.entities) {
      const entities: any = response.entities;
      return entities as Swap[];
    }
    return [];
  }
}
