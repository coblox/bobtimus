import BN from "bn.js";
import parityTestContainer from "../parityTestContainer";
import { StartedTestContainer } from "testcontainers/dist/test-container";
import Web3 from "web3";
import { EthereumWallet } from "../../src/wallets/ethereum";
import { expect } from "chai";
import EthereumHarness from "../ethereumHarness";

describe("Ethereum Wallet", () => {
  let container: StartedTestContainer;

  beforeEach("start parity container", function() {
    this.timeout(5000);
    return parityTestContainer().then(c => (container = c));
  });

  afterEach("stop parity container", function() {
    this.timeout(20000);

    if (container) {
      return container.stop();
    }
  });

  it("given initial funding, should transfer half of it with locally signed transaction", async function() {
    this.timeout(10000);

    let endpoint = `http://localhost:${container.getMappedPort(8545)}`;
    const web3 = new Web3(new Web3.providers.HttpProvider(endpoint));

    const testAddress = "0xc2457d129c78bde6a4742b3ef38a7ba7f83d00b6";
    const testAddressPrivKey = Buffer.from(
      "1759af2005454dfc596d8e0d09469f5997069e8e6b24a82defa0dae4a387e5f7",
      "hex"
    );

    const initialFunding = new BN(web3.utils.toWei("10", "ether"));

    let wallet = new EthereumWallet(web3, testAddressPrivKey, 1);
    let ethereumHarness = new EthereumHarness(web3);
    await ethereumHarness.fund(testAddress, initialFunding);

    expect(await web3.eth.getBalance(testAddress)).to.be.equal(
      initialFunding.toString(10)
    );

    const targetAddress = "0xcb777414c38e426c7038a7c4908751f5e864f7ad";

    const balanceBefore = new BN(await web3.eth.getBalance(targetAddress), 10);

    const amountToTransfer = new BN(web3.utils.toWei("10", "wei"));
    const gasPrice = new BN(0);
    const receipt = await wallet.sendTransactionTo({
      to: targetAddress,
      value: amountToTransfer,
      gasPrice,
      gasLimit: new BN(100_000)
    });

    const gasCost = new BN(receipt.gasUsed).mul(gasPrice);

    const balanceAfter = new BN(
      await web3.eth.getBalance(targetAddress),
      10
    ).toString(10);
    const expectedBalance = balanceBefore
      .add(amountToTransfer)
      .sub(gasCost)
      .toString(10);

    expect(balanceAfter).to.be.equal(expectedBalance);
  });
});
