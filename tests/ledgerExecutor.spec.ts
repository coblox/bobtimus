import BN from "bn.js";
import { TransactionReceipt } from "web3/types";
import { LedgerAction } from "../src/comitNode";
import { LedgerExecutor } from "../src/ledgerExecutor";
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

  it("Given past median timestamp, execute Ethereum refund action", async () => {
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
});
