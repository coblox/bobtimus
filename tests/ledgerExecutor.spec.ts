import BN from "bn.js";
import { TransactionReceipt } from "web3/types";
import { EthereumGasPriceService } from "../src/ethereum/ethereumGasPriceService";
import { LedgerExecutor } from "../src/ledgerExecutor";
import EthereumWalletStub from "./doubles/ethereumWalletStub";

function deployContractAction(network: string) {
  return {
    data: Buffer.from([]),
    gasLimit: new BN("10000"),
    network,
    value: new BN("1000")
  };
}

function newLedgerExecutorWithEthereumWalletConnectedToChain(chainId: number) {
  return new LedgerExecutor({
    ethereumWallet: new EthereumWalletStub({
      chainId,
      deployContractReceipt: {
        status: true
      } as TransactionReceipt
    }),
    ethereumFeeService: EthereumGasPriceService.default()
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

  // TODO: Add test for refunds on both Bitcoin and Ethereum
});
