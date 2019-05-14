import { GenericContainer } from "testcontainers";

export default function BitcoindContainer() {
  return new GenericContainer("coblox/bitcoin-core", "0.17.0")
    .withCmd([
      "-regtest",
      "-server",
      "-printtoconsole",
      "-rpcbind=0.0.0.0:18443",
      "-rpcauth=bitcoin:cb77f0957de88ff388cf817ddbc7273$9eaa166ace0d94a29c6eceb831a42458e93faeb79f895a7ee4ce03f4343f8f55",
      "-rpcallowip=0.0.0.0/0",
      "-debug=1",
      "-acceptnonstdtxn=0"
    ])
    .withExposedPorts(18443)
    .start();
}
