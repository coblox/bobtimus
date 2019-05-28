import BN = require("bn.js");
import nock, { Scope } from "nock";
import { EthereumFeeService } from "../../src/ethereum/ethereumFeeService";
import ethereumFeeServiceResponse from "../stubs/ethereumFeeService.json";

describe("EthereumFeeService tests", () => {
  let feeService: EthereumFeeService;
  let scope: Scope;

  beforeEach(() => {
    feeService = new EthereumFeeService(new BN(42), "average");
    scope = nock("https://ethgasstation.info")
      .get("/json/ethgasAPI.json")
      .reply(200, ethereumFeeServiceResponse);
  });

  it("it should get the fastest fee ", async () => {
    const fees = await feeService.retrieveGasPrice("fastest");
    expect(fees).toStrictEqual(new BN(200.0));
    scope.done();
  });

  it("it should get the average", async () => {
    const fees = await feeService.retrieveGasPrice("average");
    expect(fees).toStrictEqual(new BN(20));
    scope.done();
  });

  it("it should get the safeLow", async () => {
    const fees = await feeService.retrieveGasPrice("safeLow");
    expect(fees).toStrictEqual(new BN(10.0));
    scope.done();
  });

  it("it should return default fee", async () => {
    // remove unneeded nock mock
    nock.cleanAll();

    nock("https://ethgasstation.info")
      .get("/json/ethgasAPI.json")
      .reply(404);

    const fees = await feeService.retrieveGasPrice("average");
    expect(fees).toStrictEqual(new BN(42));
  });
});
