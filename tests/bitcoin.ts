/// <reference path="../src/bitcoin/bitcoin-core.d.ts" />
import { networks } from "bitcoinjs-lib";
import Client from "bitcoin-core";
import { BitcoinCoreRpc } from "../src/bitcoin/bitcoincore_rpc";
import { Wallet } from "../src/bitcoin/wallet";
import { expect } from "chai";
import { StartedTestContainer } from "testcontainers/dist/test-container";
import BitcoindContainer from "./bitcoind_container";
import { Satoshis } from "../src/bitcoin/blockchain";

async function generateIfNeeded() {
  const count = await bitcoinClient.getBlockCount();
  if (count < 200) {
    await bitcoinClient.generate(200 - count);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let container: StartedTestContainer;
let bitcoinClient: any;

describe("Test Bitcoin modules", () => {
  let wallet: Wallet;

  before(async function() {
    this.timeout(10000);
    let { auth, container } = await BitcoindContainer();
    let port = await container.getMappedPort(18443);
    let blockchain = new BitcoinCoreRpc(
      auth.username,
      auth.password,
      "127.0.0.1",
      port
    );

    bitcoinClient = new Client({
      protocol: "http",
      username: auth.username,
      password: auth.password,
      host: "127.0.0.1",
      port: port
    });

    wallet = new Wallet(
      "tprv8ZgxMBicQKsPdSqbVeq56smMTGXHdLACXLvb5YXyk3zv4TPeTaQ6BZWeFxoVeikyfJD5vuYsKjTKaurDZDDmZGzGDMMxXzAZgAYQSrpmoUH",
      blockchain,
      networks.regtest
    );

    await sleep(3000);

    await generateIfNeeded();
  });

  beforeEach(async () => {
    const address = wallet.getNewAddress();
    for (let i = 0; i < 5; i++) {
      await bitcoinClient.sendToAddress(address.toString(), 0.75);
    }
    await bitcoinClient.generate(1);
  });

  after(async function() {
    this.timeout(5000);
    if (container) {
      await container.stop();
    }
  });

  it("Should find UTXOs", async () => {
    expect(await wallet.refreshUtxo()).to.eq(5);
  });

  it("Can pay to address", async () => {
    await wallet.refreshUtxo();

    const tx = await wallet.payToAddress(
      "bcrt1q6rhpng9evdsfnn833a4f4vej0asu6dk5srld6x",
      new Satoshis(250000000), // Forces the use of several inputs
      55
    );
    expect(tx).to.be.a("string");

    let res = await bitcoinClient.getRawTransaction(tx);
    expect(res).to.be.a("string");
  });
});
