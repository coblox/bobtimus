import { readFileSync } from "fs";

export class BitcoindAuthCookie {
  public static fromFile(cookieFile: string) {
    const content = readFileSync(cookieFile, { encoding: "utf8" });
    const [username, password] = content.split(":");

    if (!username || !password) {
      throw new Error("cookie file did not contain valid bitcoind auth cookie");
    }

    return new BitcoindAuthCookie(username, password);
  }

  public readonly username: string;
  public readonly password: string;

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
  }
}
