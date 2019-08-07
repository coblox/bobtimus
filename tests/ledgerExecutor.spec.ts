import { networks, Transaction } from "bitcoinjs-lib";
import BN from "bn.js";
import { TransactionReceipt } from "web3/types";
import { LedgerAction } from "../src/comitNode";
import { LedgerExecutor } from "../src/ledgerExecutor";
import {
  payToAddressThrows,
  retrieveSatsPerByteThrows
} from "./doubles/bitcoinWalletStub";
import {
  deployContractThrows,
  getLatestBlockTimestampThrows,
  sendTransactionToThrows
} from "./doubles/ethereumWalletStub";

function deployContractAction(network: string) {
  return {
    data: Buffer.from([]),
    gasLimit: new BN("10000"),
    network,
    value: new BN("1000")
  };
}

function newLedgerExecutorWithEthereumWalletConnectedToChain(chainId: number) {
  return new LedgerExecutor(undefined, {
    getWalletChainId: () => chainId,
    getLatestBlockTimestamp: getLatestBlockTimestampThrows,
    deployContract: () =>
      Promise.resolve({
        status: true
      } as TransactionReceipt),
    retrieveGasPrice: () => Promise.resolve(new BN(10)),
    sendTransactionTo: sendTransactionToThrows
  });
}

describe("LedgerExecutor", () => {
  it("given EthereumWallet connected to chainId 17, when action with network regtest is passed, should execute it", async () => {
    const executor = newLedgerExecutorWithEthereumWalletConnectedToChain(17);

    const receipt = await executor.ethereumDeployContract(
      deployContractAction("regtest")
    );

    expect(receipt).toStrictEqual({
      status: true
    });
  });

  it("given EthereumWallet connected to chainId 3, when action with network ropsten is passed, should execute it", async () => {
    const executor = newLedgerExecutorWithEthereumWalletConnectedToChain(3);

    const receipt = await executor.ethereumDeployContract(
      deployContractAction("ropsten")
    );

    expect(receipt).toStrictEqual({
      status: true
    });
  });

  it("given EthereumWallet connected to chainId 1, when action with network mainnet is passed, should fail", async () => {
    const executor = newLedgerExecutorWithEthereumWalletConnectedToChain(1);

    await expect(
      executor.ethereumDeployContract(deployContractAction("mainnet"))
    ).rejects.toMatchInlineSnapshot(
      `[Error: Unsupported network. Bobtimus does not support Ethereum network 'mainnet' because no mapping to the chainId has been defined]`
    );
  });

  it("given EthereumWallet connected to chainId 3, when action with network regtest is passed, should fail", async () => {
    const executor = newLedgerExecutorWithEthereumWalletConnectedToChain(3);

    await expect(
      executor.ethereumDeployContract(deployContractAction("regtest"))
    ).rejects.toMatchInlineSnapshot(
      `[Error: Incompatible Ethereum network. Received: 'regtest'(chainId: 17), but wallet chainID is 3]`
    );
  });

  it("given EthereumWallet connected to chainId 17, when action with network ropsten is passed, should fail", async () => {
    const executor = newLedgerExecutorWithEthereumWalletConnectedToChain(17);

    await expect(
      executor.ethereumDeployContract(deployContractAction("ropsten"))
    ).rejects.toMatchInlineSnapshot(
      `[Error: Incompatible Ethereum network. Received: 'ropsten'(chainId: 3), but wallet chainID is 17]`
    );
  });

  it("Given past block timestamp, execute Ethereum refund action", async () => {
    const sendTransactionTo = jest.fn();
    sendTransactionTo.mockReturnValueOnce(
      Promise.resolve({
        status: true
      } as TransactionReceipt)
    );

    const executor = new LedgerExecutor(undefined, {
      getWalletChainId: () => 3,
      getLatestBlockTimestamp: () => Promise.resolve(17000),
      deployContract: deployContractThrows,
      retrieveGasPrice: () => Promise.resolve(new BN(10)),
      sendTransactionTo
    });

    const action: LedgerAction = {
      type: "ethereum-call-contract",
      payload: {
        contract_address: "0xfoo",
        data: "0xdeadbeef",
        gas_limit: "0x2710",
        network: "ropsten",
        min_block_timestamp: 20
      }
    };

    await executor.execute(action);

    const expectedArg = {
      gasPrice: new BN("10"),
      gasLimit: new BN("10000"),
      to: "0xfoo",
      data: Buffer.from("deadbeef", "hex")
    };
    const actualArg = sendTransactionTo.mock.calls[0][0];
    expect(JSON.stringify(actualArg)).toEqual(JSON.stringify(expectedArg));
  });

  it("Given past median timestamp, execute Bitcoin refund action", async () => {
    const broadcastTransaction = jest.fn();
    broadcastTransaction.mockReturnValueOnce(Promise.resolve("broadcasted!"));

    const transactionHex =
      "01000000013ea2097dbb3bf6932b97d2469b4fa78e28a2e8d05c586affe9c8cb66dba52543000000008a47304402206f40f4eb8c6cab7c6dd45a132d437e736a6a0dddfb2b78b10e6efbcaf61592f602200d329a57d7a0c969cc349f41852da4ba1a3bc2245e656bdd41780455b97bf84a014104aa49fbe6608076318ff09171e3c2b4a2effa52d53a417371140642996693ae3ac53ce300fff7fef650d0a2418b087a237aa6838eed3bdfad0ec0069df7209f4affffffff0190d60200000000001976a91401ddbca1a39b60b54fb671297a4a20a7681e017188ac00000000";

    const executor = new LedgerExecutor({
      getBlockTime: () => Promise.resolve(20),
      getWalletNetwork: () => networks.regtest,
      broadcastTransaction,
      retrieveSatsPerByte: retrieveSatsPerByteThrows,
      payToAddress: payToAddressThrows
    });

    const action: LedgerAction = {
      type: "bitcoin-broadcast-signed-transaction",
      payload: {
        hex: transactionHex,
        network: "regtest",
        min_median_block_time: 10
      }
    };

    await executor.execute(action);
    const expectedArg = Transaction.fromHex(transactionHex);
    const actualArg = broadcastTransaction.mock.calls[0][0];
    expect(JSON.stringify(actualArg)).toEqual(JSON.stringify(expectedArg));
  });
});
