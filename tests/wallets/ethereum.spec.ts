import BN from "bn.js";
import utils from "ethereumjs-util";
import Web3 from "web3";
import {
  EthereumWallet,
  Web3EthereumBlockchainConnector
} from "../../src/wallets/ethereum";
import containerTest from "../containerTest";
import { EthereumBlockchainConnectorStub } from "../ethereumBlockchainConnectorStub";
import EthereumHarness from "../ethereumHarness";
import parityTestContainer from "../parityTestContainer";

async function fundAddressOfPrivateKey(web3: Web3, privateKey: Buffer) {
  const initialFunding = new BN(web3.utils.toWei("10", "ether"));
  const address = "0x" + utils.privateToAddress(privateKey).toString("hex");

  const ethereumHarness = new EthereumHarness(web3);
  await ethereumHarness.fund(address, initialFunding);

  // sanity check that we actually funded
  expect(await web3.eth.getBalance(address)).toEqual(
    initialFunding.toString(10)
  );

  return initialFunding;
}

const privateKey = Buffer.from(
  "1759af2005454dfc596d8e0d09469f5997069e8e6b24a82defa0dae4a387e5f7",
  "hex"
);

describe("Ethereum Wallet", () => {
  test(
    "given initial funding, should transfer half of it with locally signed transaction",
    containerTest(parityTestContainer, async container => {
      const targetAddress = "0xcb777414c38e426c7038a7c4908751f5e864f7ad";

      const web3 = new Web3(
        new Web3.providers.HttpProvider(
          `http://localhost:${container.getMappedPort(8545)}`
        )
      );
      const wallet = new EthereumWallet(
        new Web3EthereumBlockchainConnector(web3),
        privateKey,
        1
      );

      const amountFounded = await fundAddressOfPrivateKey(web3, privateKey);
      const amountToTransfer = amountFounded.divn(2);
      const gasPrice = new BN(0);

      const balanceBefore = await web3.eth.getBalance(targetAddress);
      const receipt = await wallet.sendTransactionTo({
        to: targetAddress,
        value: amountToTransfer,
        gasPrice,
        gasLimit: new BN(100_000)
      });
      const balanceAfter = await web3.eth.getBalance(targetAddress);

      const gasCost = new BN(receipt.gasUsed).mul(gasPrice);
      const expectedBalance = new BN(balanceBefore, 10)
        .add(amountToTransfer)
        .sub(gasCost)
        .toString(10);

      expect(balanceAfter).toEqual(expectedBalance);
    }),
    20000
  );

  test("given transaction params without data, fails for `deployContract`", () => {
    const wallet = new EthereumWallet(
      new EthereumBlockchainConnectorStub(),
      privateKey,
      1
    );

    expect(
      wallet.deployContract({
        gasLimit: new BN(100_000),
        gasPrice: new BN(0)
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Contract deployments must have \`data\`.]`
    );
  });

  test("given transaction params with a `to` address, fails for `deployContract`", async () => {
    const wallet = new EthereumWallet(
      new EthereumBlockchainConnectorStub(),
      privateKey,
      1
    );

    expect(
      wallet.deployContract({
        gasLimit: new BN(100_000),
        gasPrice: new BN(0),
        to: "0x0000000000000000000000000000000000000000"
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Contract deployments must not set a \`to\` address.]`
    );
  });

  test("given transaction params without a `to` address and without `data`, fails for `sendTransactionTo`", async () => {
    const wallet = new EthereumWallet(
      new EthereumBlockchainConnectorStub(),
      privateKey,
      1
    );

    expect(
      wallet.deployContract({
        gasLimit: new BN(100_000),
        gasPrice: new BN(0)
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Contract deployments must have \`data\`.]`
    );
  });
});
