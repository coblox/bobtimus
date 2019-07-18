import { writeFileSync } from "fs";
import { fileSync } from "tmp";
import { BitcoindAuthCookie } from "../../src/bitcoin/bitcoindAuthCookie";

describe("BitcoindAuthCookie", () => {
  it("should parse cookie from file", () => {
    const tmpFile = fileSync().name;
    writeFileSync(
      tmpFile,
      "__cookie__:8d3a9bb29c9998553433318c732d11c11f439db727e884b57865a2b9dce040df",
      {
        encoding: "utf8"
      }
    );

    const cookie = BitcoindAuthCookie.fromFile(tmpFile);

    expect(cookie.username).toEqual("__cookie__");
    expect(cookie.password).toEqual(
      "8d3a9bb29c9998553433318c732d11c11f439db727e884b57865a2b9dce040df"
    );
  });
});
