import { BitcoinFeeService } from "../src/bitcoin/bitcoinFeeService";
import { DefaultFieldDataSource } from "../src/fieldDataSource";
import BitcoinWalletStub from "./doubles/bitcoinWalletStub";
import EthereumWalletStub from "./doubles/ethereumWalletStub";

describe("DefaultFieldDataSource", () => {
  it("returns an Ethereum address when classes are `ethereum` and `address`", async () => {
    const datastore = new DefaultFieldDataSource({
      ethereumWallet: new EthereumWalletStub({
        address: "0x1fed25f1780b9e5b8d74279535fdec4f7fb93b13"
      })
    });

    const data = await datastore.getData({
      name: "Some field",
      class: ["ethereum", "address"]
    });

    expect(data).toEqual("0x1fed25f1780b9e5b8d74279535fdec4f7fb93b13");
  });

  it("returns undefined when classes are `ethereum` and `address` but EthereumWallet is not provided", async () => {
    const datastore = new DefaultFieldDataSource({});

    const data = await datastore.getData({
      name: "Some field",
      class: ["ethereum", "address"]
    });

    expect(data).toBeUndefined();
  });

  it("returns a Bitcoin address when classes are `bitcoin` and `address`", async () => {
    const datastore = new DefaultFieldDataSource({
      bitcoinWallet: new BitcoinWalletStub({
        address: "bcrt1qwap88jwqyweysay8gff6jukxr3em3k4z93wevc"
      })
    });

    const data = await datastore.getData({
      name: "Some field",
      class: ["bitcoin", "address"]
    });

    expect(data).toEqual("bcrt1qwap88jwqyweysay8gff6jukxr3em3k4z93wevc");
  });

  it("returns a undefined when classes are `bitcoin` and `address` but BitcoinWallet is not provided", async () => {
    const datastore = new DefaultFieldDataSource({});

    const data = await datastore.getData({
      name: "Some field",
      class: ["bitcoin", "address"]
    });

    expect(data).toBeUndefined();
  });

  it("returns a Fee per byte value when classes are `bitcoin` and `feePerByte`", async () => {
    const datastore = new DefaultFieldDataSource({
      bitcoinFeeService: BitcoinFeeService.default()
    });
    const data = await datastore.getData({
      name: "Some field",
      class: ["bitcoin", "feePerByte"]
    });
    expect(data).toBeGreaterThan(0);
  });

  it("returns undefined when the classes are unknown", async () => {
    const datastore = new DefaultFieldDataSource({});
    const data = await datastore.getData({
      name: "Some field",
      class: ["ripple", "address"]
    });
    expect(data).toBeUndefined();
  });
});
