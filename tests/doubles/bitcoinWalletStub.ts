import Big from "big.js";
import { Network } from "bitcoinjs-lib";
import { Satoshis } from "../../src/bitcoin/blockchain";
import { BitcoinWallet } from "../../src/wallets/bitcoin";
import resolveOrReject from "./resolveOrReject";
import returnOrThrow from "./returnOrThrow";

interface BitcoinWalletStubArgs {
  network?: Network;
  address?: string;
  payToAdressTransactionId?: string;
  nominalBalance?: Big;
}

export default class BitcoinWalletStub implements BitcoinWallet {
  public readonly network?: Network;
  public readonly address?: string;
  public readonly payToAdressTransactionId?: string;
  public readonly nominalBalance?: Big;

  constructor({
    network,
    address,
    payToAdressTransactionId,
    nominalBalance
  }: BitcoinWalletStubArgs) {
    this.network = network;
    this.address = address;
    this.payToAdressTransactionId = payToAdressTransactionId;
    this.nominalBalance = nominalBalance;
  }

  public getNetwork(): Network {
    return returnOrThrow(this, "network");
  }

  public getNewAddress(): string {
    return returnOrThrow(this, "address");
  }

  public payToAddress(
    // @ts-ignore
    address: string,
    // @ts-ignore
    amount: Satoshis,
    // @ts-ignore
    feeSatPerByte: Satoshis
  ): Promise<string> {
    return resolveOrReject(this, "payToAdressTransactionId");
  }

  public getNominalBalance(): Big {
    return returnOrThrow(this, "nominalBalance");
  }
}

export function getWalletNetworkThrows(): Network {
  throw new Error("Mock not configured to return Bitcoin network");
}

export function broadcastTransactionThrows(): Promise<string> {
  throw new Error("Mock not configured to broadcast a Bitcoin transaction");
}

export function retrieveSatsPerByteThrows(): Promise<number> {
  throw new Error("Mock not configured to return Sats per byte fee");
}

export function payToAddressThrows(): Promise<string> {
  throw new Error("Mock not configured to pay to Bitcoin address");
}
