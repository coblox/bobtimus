import { hexToBuffer } from "../src/comitNode";

describe("Comit Node library tests", () => {
  it("should remove `0x` prefix and decode the hex string to a buffer", () => {
    const actualBuffer = hexToBuffer("0x000102030405060708090a");
    const expectedBuffer = Buffer.from("000102030405060708090a", "hex");

    expect(actualBuffer).toEqual(expectedBuffer);
  });

  it("should not modify an un-prefixed hex string and decode it to a buffer", () => {
    const actualBuffer = hexToBuffer("000102030405060708090a");
    const expectedBuffer = Buffer.from("000102030405060708090a", "hex");

    expect(actualBuffer).toEqual(expectedBuffer);
  });

  it("should return an empty buffer if the hex string is empty", () => {
    const actualBuffer = hexToBuffer("");
    const expectedBuffer = Buffer.alloc(0);

    expect(actualBuffer).toEqual(expectedBuffer);
  });

  it("throw an error if the string passed is not valid hex", () => {
    expect(() => hexToBuffer("abcdefghsdc")).toThrowError("Invalid hex string");
  });
});
