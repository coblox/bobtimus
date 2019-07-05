import BN from "bn.js";
import utils from "ethereumjs-util";
import Web3 from "web3";
import { AbiItem, toBN, toWei } from "web3-utils";
import { Web3EthereumWallet } from "../../src/wallets/ethereum";
import parityTestContainer from "../containers/parityTestContainer";
import containerTest from "../containerTest";
import EthereumHarness from "../ethereumHarness";
import GreeterABI from "../GreeterABI.json";
import sleep from "../sleep";

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
const greeterContractCode = Buffer.from(
  "608060405234801561001057600080fd5b5061020c806100206000396000f3fe60806040526004361061003b576000357c010000000000000000000000000000000000000000000000000000000090048063ead710c414610040575b600080fd5b34801561004c57600080fd5b506101066004803603602081101561006357600080fd5b810190808035906020019064010000000081111561008057600080fd5b82018360208201111561009257600080fd5b803590602001918460018302840111640100000000831117156100b457600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f820116905080830192505050505050509192919290505050610108565b005b7f8252da6cc8ba70656d63b4439295f2de59ffee7cf90c96f5aee10857159474e781604051808060200180602001838103835260058152602001807f48656c6c6f000000000000000000000000000000000000000000000000000000815250602001838103825284818151815260200191508051906020019080838360005b838110156101a2578082015181840152602081019050610187565b50505050905090810190601f1680156101cf5780820380516001836020036101000a031916815260200191505b50935050505060405180910390a15056fea165627a7a72305820a7fc90d894eccd0e714c28a89f2dff015f9e03a78a8dcca74ed34bef840c23690029",
  "hex"
);

describe("Ethereum Wallet", () => {
  test(
    "given initial funding, should transfer half of it with locally signed transaction",
    containerTest(parityTestContainer, async ({ container }) => {
      const targetAddress = "0xcb777414c38e426c7038a7c4908751f5e864f7ad";

      const web3 = new Web3(
        new Web3.providers.HttpProvider(
          `http://localhost:${container.getMappedPort(8545)}`
        )
      );
      const wallet = await Web3EthereumWallet.newInstance(web3, privateKey);

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

  test(
    "should be able to deploy and invoke greeter contract",
    containerTest(parityTestContainer, async ({ container }) => {
      const web3 = new Web3(
        new Web3.providers.HttpProvider(
          `http://localhost:${container.getMappedPort(8545)}`
        )
      );
      const wallet = await Web3EthereumWallet.newInstance(web3, privateKey);

      await fundAddressOfPrivateKey(web3, privateKey);

      const deploymentReceipt = await wallet.deployContract({
        gasPrice: new BN(0),
        gasLimit: new BN(1_000_000),
        data: greeterContractCode
      });
      expect(deploymentReceipt.contractAddress).not.toBeUndefined();

      // wait for parity to mine the transaction
      // parity sometimes takes up to 4 seconds to actually mine the transaction even though it already returned the receipt. this is how we cater for that.
      // See https://github.com/paritytech/parity-ethereum/issues/10672 for details
      await sleep(10000);

      const contract = new web3.eth.Contract(GreeterABI as AbiItem[]);
      const methodCall = contract.methods.greet("Thomas").encodeABI();

      // need to trim `0x` from generated data
      const invocationData = Buffer.from(methodCall.substring(2), "hex");

      const receipt = await wallet.sendTransactionTo({
        // @ts-ignore
        to: deploymentReceipt.contractAddress,
        gasPrice: new BN(10),
        gasLimit: new BN(1_000_000),
        data: invocationData
      });

      expect(receipt.logs).toHaveLength(1);

      const data = receipt.logs[0].data;
      const logData = Buffer.from(data.substring(2), "hex").toString("utf8");

      expect(logData).toContain("Hello");
      expect(logData).toContain("Thomas");
    }),
    30000
  );

  test(
    "given initial funding, returns the correct balance",
    containerTest(parityTestContainer, async ({ container }) => {
      const web3 = new Web3(
        new Web3.providers.HttpProvider(
          `http://localhost:${container.getMappedPort(8545)}`
        )
      );
      const wallet = await Web3EthereumWallet.newInstance(web3, privateKey);

      const amountFounded = await fundAddressOfPrivateKey(web3, privateKey);
      const balance = await wallet.getBalance();
      const balanceAfter = toWei(toBN(balance.toFixed()));
      expect(balanceAfter.toString()).toEqual(amountFounded.toString());
    }),
    20000
  );
});
