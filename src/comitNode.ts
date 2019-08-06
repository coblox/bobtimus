import BN = require("bn.js");
import request from "request-promise-native";
import URI from "urijs";
import { Action, Entity } from "../gen/siren";
import { getLogger } from "./logging/logger";

const logger = getLogger();

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

export interface ComitMetadata {
  id: string;
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
  private readonly cndUrl: uri.URI;

  constructor(cndUrl: uri.URI) {
    this.cndUrl = cndUrl;
  }

  public prependUrlIfNeeded(path: string): uri.URI {
    const uriPath = new URI(path);
    const cndUrl = this.cndUrl.clone();
    return uriPath.is("relative") ? cndUrl.segment(path) : uriPath;
  }

  public getSwaps(): Promise<Entity[]> {
    const options = {
      method: "GET",
      url: this.prependUrlIfNeeded("/swaps").toString(),
      json: true
    };

    return request(options).then(response => response.entities);
  }

  public getMetadata(): Promise<ComitMetadata> {
    const options = {
      method: "GET",
      url: this.prependUrlIfNeeded("/").toString(),
      json: true
    };

    return request(options).then(response => response as ComitMetadata);
  }

  public request(method: any, url: string, data: any) {
    let options;
    if (method === "GET") {
      options = {
        method,
        uri: this.prependUrlIfNeeded(url)
          .query(URI.buildQuery(data))
          .toString(),
        json: true
      };
    } else {
      options = {
        method,
        uri: this.prependUrlIfNeeded(url).toString(),
        body: data,
        json: true
      };
    }

    logger.log(
      "trace",
      `Doing a ${options.method} request to ${options.uri}`,
      options
    );

    return request(options);
  }
}

export function hexToBuffer(hex: string) {
  if (!hex) {
    return Buffer.alloc(0);
  }
  if (hex.startsWith("0x")) {
    hex = hex.substring(2);
  }
  const expectedLength = hex.length / 2;
  const buf = Buffer.from(hex, "hex");

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
