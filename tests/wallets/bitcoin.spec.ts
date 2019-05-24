/// <reference path="../../src/bitcoin/bitcoin-core.d.ts" />
import Client from "bitcoin-core";
import { bip32, networks } from "bitcoinjs-lib";
import { BitcoinCoreRpc } from "../../src/bitcoin/bitcoinCoreRpc";
import { Satoshis } from "../../src/bitcoin/blockchain";
import { BitcoinWallet } from "../../src/wallets/bitcoin";
import bitcoindTestContainer from "../containers/bitcoindTestContainer";
import containerTest from "../containerTest";
import sleep from "../sleep";

describe("Bitcoin wallet", () => {
  it(
    "should find all UTXOs after paying to address derived from extended pub key",
    containerTest(bitcoindTestContainer, async ({ container, auth }) => {
      const port = await container.getMappedPort(18443);
      const blockchain = new BitcoinCoreRpc(
        auth.username,
        auth.password,
        "127.0.0.1",
        port
      );
      const bitcoinClient = new Client({
        protocol: "http",
        username: auth.username,
        password: auth.password,
        host: "127.0.0.1",
        port
      });

      const wallet = new BitcoinWallet(
        bip32.fromBase58(
          "tprv8ZgxMBicQKsPdSqbVeq56smMTGXHdLACXLvb5YXyk3zv4TPeTaQ6BZWeFxoVeikyfJD5vuYsKjTKaurDZDDmZGzGDMMxXzAZgAYQSrpmoUH",
          networks.regtest
        ),
        blockchain,
        networks.regtest
      );

      await sleep(3000);
      await bitcoinClient.generate(200);

      const address = wallet.getNewAddress();
      for (let i = 0; i < 5; i++) {
        await bitcoinClient.sendToAddress(address.toString(), 0.75);
      }
      await bitcoinClient.generate(1);

      expect(await wallet.refreshUtxo()).toEqual(5);
    }),
    10000
  );

  it(
    "can use multiple UTXOs for paying to foreign address",
    containerTest(bitcoindTestContainer, async ({ container, auth }) => {
      const port = await container.getMappedPort(18443);
      const blockchain = new BitcoinCoreRpc(
        auth.username,
        auth.password,
        "127.0.0.1",
        port
      );
      const bitcoinClient = new Client({
        protocol: "http",
        username: auth.username,
        password: auth.password,
        host: "127.0.0.1",
        port
      });

      const wallet = new BitcoinWallet(
        bip32.fromBase58(
          "tprv8ZgxMBicQKsPdSqbVeq56smMTGXHdLACXLvb5YXyk3zv4TPeTaQ6BZWeFxoVeikyfJD5vuYsKjTKaurDZDDmZGzGDMMxXzAZgAYQSrpmoUH",
          networks.regtest
        ),
        blockchain,
        networks.regtest
      );

      await sleep(3000);
      await bitcoinClient.generate(200);

      const address = wallet.getNewAddress();
      for (let i = 0; i < 5; i++) {
        await bitcoinClient.sendToAddress(address.toString(), 0.75);
      }
      await bitcoinClient.generate(1);

      await wallet.refreshUtxo();

      const tx = await wallet.payToAddress(
        "bcrt1q6rhpng9evdsfnn833a4f4vej0asu6dk5srld6x",
        new Satoshis(250000000), // Forces the use of several inputs
        55
      );
      expect(typeof tx).toBe("string");

      const res = await bitcoinClient.getRawTransaction(tx);
      expect(typeof res).toBe("string");
    }),
    10000
  );
});
