import BN from "bn.js";
import Web3 from "web3";

const PARITY_DEV_ACCOUNT = "0x00a329c0648769a73afac7f9381e08fb43dbea72";

export default class EthereumHarness {
  private web3: Web3;

  constructor(web3: Web3) {
    this.web3 = web3;
  }

  public async fund(address: string, amount: BN) {
    await this.web3.eth.personal.sendTransaction(
      {
        from: PARITY_DEV_ACCOUNT,
        to: address,
        value: `0x${amount.toString("hex")}`
      },
      ""
    );
  }
}
