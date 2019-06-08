#!/usr/bin/env bash

/Users/froyer/src/parity-ethereum/target/release/parity --jsonrpc-apis=all \
      --unsafe-expose \
      --tracing=on \
      --logging=debug,ethcore-miner=trace,miner=trace,rpc=trace,tokio_core=warn,tokio_reactor=warn \
      --jsonrpc-cors="all" \
      --chain=dev