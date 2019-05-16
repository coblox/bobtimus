import { RpcAuth } from "./bitcoind_container";
import { expect } from "chai";

describe("Test RpcAuth", () => {
  it("should generate correct password hash", () => {
    let auth = new RpcAuth(
      "bitcoin",
      "54pLR_f7-G6is32LP-7nbhzZSbJs_2zSATtZV_r05yg=",
      "cb77f0957de88ff388cf817ddbc7273"
    );
    let parameters = auth.encodeToAuthParameters();

    expect(parameters).equals(
      "bitcoin:cb77f0957de88ff388cf817ddbc7273$9eaa166ace0d94a29c6eceb831a42458e93faeb79f895a7ee4ce03f4343f8f55"
    );
  });
});
