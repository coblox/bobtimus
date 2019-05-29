import BN = require("bn.js");
import nock, { Scope } from "nock";
import { EthereumGasPriceService } from "../../src/ethereum/ethereumGasPriceService";
import ethereumGasPriceServiceResponse from "../stubs/ethereumGasPriceService.json";

describe("EthereumGasPriceService tests", () => {
  let feeService: EthereumGasPriceService;
  let scope: Scope;

  beforeEach(() => {
    feeService = new EthereumGasPriceService(new BN(42), "average");
    scope = nock("https://ethgasstation.info")
      .get("/json/ethgasAPI.json")
      .reply(200, ethereumGasPriceServiceResponse);
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
