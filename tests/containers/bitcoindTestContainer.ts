import crypto from "crypto";
import { GenericContainer } from "testcontainers";

export default async function bitcoindTestContainer() {
  const auth = new RpcAuth("bitcoin");
  const authParameters = auth.encodeToAuthParameters();

  const container = await new GenericContainer("coblox/bitcoin-core", "0.17.0")
    .withCmd([
      "-regtest",
      "-server",
      "-printtoconsole",
      "-rpcbind=0.0.0.0:18443",
      `-rpcauth=${authParameters}`,
      "-rpcallowip=0.0.0.0/0",
      "-debug=1",
      "-acceptnonstdtxn=0"
    ])
    .withExposedPorts(18443)
    .start();

  return { auth, container };
}

export class RpcAuth {
  public readonly username: string;
  public readonly password: string;
  private readonly salt: string;

  constructor(
    username: string,
    password: string = randomValueHex(32),
    salt: string = randomValueHex(16)
  ) {
    this.username = username;
    this.password = password;
    this.salt = salt;
  }

  public encodeToAuthParameters() {
    const hmac = crypto.createHmac("sha256", this.salt);
    hmac.write(this.password);
    hmac.end();
    const hash = hmac.read().toString("hex");
    return `${this.username}:${this.salt}\$${hash}`;
  }
}

function randomValueHex(len: number) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString("hex") // convert to hexadecimal format
    .slice(0, len); // return required number of characters
}
