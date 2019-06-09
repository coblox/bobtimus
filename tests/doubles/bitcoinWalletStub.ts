import { Network } from "bitcoinjs-lib";
import { Satoshis } from "../../src/bitcoin/blockchain";
import { BitcoinWallet } from "../../src/wallets/bitcoin";
import returnOrThrow from "./returnOrThrow";

interface BitcoinWalletStubArgs {
  network?: Network;
  address?: string;
  payToAdressTransactionId?: string;
}

export default class BitcoinWalletStub implements BitcoinWallet {
  public readonly network?: Network;
  public readonly address?: string;
  public readonly payToAdressTransactionId?: string;

  constructor({
    network,
    address,
    payToAdressTransactionId
  }: BitcoinWalletStubArgs) {
    this.network = network;
    this.address = address;
    this.payToAdressTransactionId = payToAdressTransactionId;
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
    return returnOrThrow(this, "payToAdressTransactionId");
  }
}
