import Big from "big.js";
import BN = require("bn.js");
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

export type LedgerAction =
  | {
      type: "bitcoin-send-amount-to-address";
      payload: { to: string; amount: string; network: string };
    }
  | {
      type: "bitcoin-broadcast-signed-transaction";
      payload: {
        hex: string;
        network: string;
        min_median_block_time?: number;
      };
    }
  | {
      type: "ethereum-deploy-contract";
      payload: {
        data: string;
        amount: string;
        gas_limit: string;
        network: string;
      };
    }
  | {
      type: "ethereum-call-contract";
      payload: {
        contract_address: string;
        data: string;
        gas_limit: string;
        network: string;
        min_block_timestamp?: number;
      };
    };

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

export function hexToBuffer(hex: string) {
  if (!hex) {
    return Buffer.alloc(0);
  }
  let expectedLength = hex.length / 2;
  let buf;
  if (hex.startsWith("0x")) {
    buf = Buffer.from(hex.substring(2), "hex");
    expectedLength = (hex.length - 2) / 2;
  } else {
    buf = Buffer.from(hex, "hex");
  }
  // `Buffer.from` decode the string until it can't so if hex
  // starts with valid hex characters but is actually invalid then
  // Buffer.from will still return a non-empty result
  if (!buf.length || buf.length !== expectedLength) {
    throw new Error(`Invalid hex string: ${hex}`);
  }
  return buf;
}

export function hexToBN(hex: string) {
  if (!hex) {
    throw new Error("Empty hex string");
  }
  if (hex.startsWith("0x")) {
    return new BN(hex.substring(2), "hex");
  }
  return new BN(hex, "hex");
}
