/// <reference path="../src/bitcoin/bitcoin-core.d.ts" />
import { networks } from "bitcoinjs-lib";
import Client from "bitcoin-core";
import { BitcoinCoreRpc } from "../src/bitcoin/bitcoincore_rpc";
import { Wallet } from "../src/bitcoin/wallet";
import { expect } from "chai";

async function generateIfNeeded() {
  const count = await bitcoinClient.getBlockCount();
  if (count < 200) {
    await bitcoinClient.generate(200 - count);
  }
}

const bitcoinClient = new Client({
  protocol: "http",
  username: "bitcoin",
  password: "54pLR_f7-G6is32LP-7nbhzZSbJs_2zSATtZV_r05yg=",
  host: "127.0.0.1",
  port: "18443"
});

describe("Test Bitcoin modules", () => {
  let wallet: Wallet;

  before(async () => {
    let blockchain = new BitcoinCoreRpc(
      "bitcoin",
      "54pLR_f7-G6is32LP-7nbhzZSbJs_2zSATtZV_r05yg=",
      "127.0.0.1",
      "18443"
    );

    wallet = new Wallet(
      "tprv8ZgxMBicQKsPdSqbVeq56smMTGXHdLACXLvb5YXyk3zv4TPeTaQ6BZWeFxoVeikyfJD5vuYsKjTKaurDZDDmZGzGDMMxXzAZgAYQSrpmoUH",
      blockchain,
      networks.regtest
    );

    await generateIfNeeded();
  });

  beforeEach(async () => {
    const address = await wallet.getNewAddress();
    await bitcoinClient.sendToAddress(address.toString(), 5.86);
    await bitcoinClient.generate(1);
  });

  it("Should find UTXOs", async () => {
    expect(await wallet.refreshUtxo()).to.be.greaterThan(0);
  });

  it("Can pay to address", async () => {
    await wallet.refreshUtxo();

    const tx = await wallet.payToAddress(
      "bcrt1q6rhpng9evdsfnn833a4f4vej0asu6dk5srld6x",
      "10000"
    );
    expect(tx).to.be.a("string");

    let res = await bitcoinClient.getRawTransaction(tx);
    expect(res).to.be.a("string");
  });
});
