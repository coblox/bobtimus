import { GenericContainer } from "testcontainers";

export default function parityTestContainer() {
  return new GenericContainer("parity/parity", "v2.5.1")
    .withCmd([
      "--config=dev",
      "--jsonrpc-apis=all",
      "--unsafe-expose",
      "--tracing=on",
      "--logging=debug,ethcore-miner=trace,miner=trace,rpc=trace,tokio_core=warn,tokio_reactor=warn",
      "--jsonrpc-cors='all'"
    ])
    .withExposedPorts(8545)
    .start();
}
