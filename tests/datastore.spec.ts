import BN = require("bn.js");
import { BitcoinCoreRpc } from "../src/bitcoin/bitcoinCoreRpc";
import { BitcoinFeeService } from "../src/bitcoin/bitcoinFeeService";
import { BitcoinConfig, Config } from "../src/config";
import { InternalDatastore } from "../src/datastore";
import { InternalBitcoinWallet } from "../src/wallets/bitcoin";
import { EthereumWallet } from "../src/wallets/ethereum";

describe("InternalDatastore tests", () => {
  let bitcoinWallet: InternalBitcoinWallet;
  let ethereumWallet: EthereumWallet;
  let bitcoinFeeService: BitcoinFeeService;

  beforeAll(() => {
    const config = new Config({
      comitNodeUrl: "http://localhost:8000",
      seedWords:
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon",
      rates: { ether: { bitcoin: { sell: 0.0095, buy: 0.0105 } } },
      ledgers: {
        bitcoin: {
          type: "coreRpc",
          rpcUsername: "bitcoin",
          rpcPassword: "password",
          rpcHost: "127.0.0.1",
          rpcPort: 18443,
          network: "regtest",
          fee: {
            defaultFee: 10,
            strategy: "hourFee"
          }
        },
        ethereum: {
          web3Endpoint: "http://localhost:8545",
          fee: {
            defaultFee: new BN(10),
            strategy: "average"
          }
        }
      }
    });
    const bitcoinConfig = config.bitcoinConfig as BitcoinConfig;
    const bitcoinBlockchain = BitcoinCoreRpc.fromConfig(bitcoinConfig);
    bitcoinWallet = InternalBitcoinWallet.fromConfig(
      bitcoinConfig,
      bitcoinBlockchain,
      config.seed,
      0
    );
    ethereumWallet = EthereumWallet.fromConfig(
      // @ts-ignore: config.ethereumConfig is expected to exist
      config.ethereumConfig,
      config.seed,
      1
    );
    bitcoinFeeService = BitcoinFeeService.default();
  });

  it("Returns an Ethereum address when classes are `ethereum` and `address`", async () => {
    const datastore = new InternalDatastore({ ethereumWallet });
    const data = await datastore.getData({
      name: "Some field",
      class: ["ethereum", "address"]
    });
    expect(data).toEqual("0x1fed25f1780b9e5b8d74279535fdec4f7fb93b13");
  });

  it("Returns a Bitcoin address when classes are `undefined` and `address`", async () => {
    const datastore = new InternalDatastore({ bitcoinWallet });
    const data = await datastore.getData({
      name: "Some field",
      class: ["bitcoin", "address"]
    });
    expect(data).toEqual("bcrt1qwap88jwqyweysay8gff6jukxr3em3k4z93wevc");
  });

  it("Returns a Fee per byte value when classes are `bitcoin` and `feePerByte`", async () => {
    const datastore = new InternalDatastore({ bitcoinFeeService });
    const data = await datastore.getData({
      name: "Some field",
      class: ["bitcoin", "feePerByte"]
    });
    expect(data).toBeGreaterThan(0);
  });

  it("Returns undefined when the classes are unknown", async () => {
    const datastore = new InternalDatastore({
      bitcoinWallet,
      ethereumWallet,
      bitcoinFeeService
    });
    const data = await datastore.getData({
      name: "Some field",
      class: ["ripple", "address"]
    });
    expect(data).toBeUndefined();
  });
});
