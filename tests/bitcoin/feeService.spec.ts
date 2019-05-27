import nock, { Scope } from "nock";
import { FeeService } from "../../src/bitcoin/bitcoinFeeService";
import bitcoinFeeService from "../stubs/bitcoinFeeService.json";

describe("FeeService tests", () => {
  let feeService: FeeService;
  let scope: Scope;

  beforeEach(() => {
    feeService = new FeeService(42, "hourFee");
    scope = nock("https://bitcoinfees.earn.com")
      .get("/api/v1/fees/recommended")
      .reply(200, bitcoinFeeService);
  });

  it("it should get the fastestFee ", async () => {
    const fees = await feeService.retrieveSatsPerByte("fastestFee");
    expect(fees).toBeGreaterThanOrEqual(30);
    scope.done();
  });

  it("it should get the halfHourFee", async () => {
    const fees = await feeService.retrieveSatsPerByte("halfHourFee");
    expect(fees).toBeGreaterThanOrEqual(20);
    scope.done();
  });

  it("it should get the hourFee", async () => {
    const fees = await feeService.retrieveSatsPerByte("hourFee");
    expect(fees).toBeGreaterThanOrEqual(1);
    scope.done();
  });

  it("it should return default fee", async () => {
    // remove unneeded nock mock
    nock.cleanAll();

    nock("https://bitcoinfees.earn.com")
      .get("/api/v1/fees/recommended")
      .reply(404);

    const fees = await feeService.retrieveSatsPerByte("hourFee");
    expect(fees).toBeGreaterThanOrEqual(42);
  });
});
