#!/bin/bash

TO=$1

curl --data "{\"method\":\"personal_sendTransaction\",\"params\":[{\"from\":\"0x00a329c0648769a73afac7f9381e08fb43dbea72\",\"to\":\"${TO}\",\"value\":\"0xDE0B6B3A7640000\"},\"\"],\"id\":1,\"jsonrpc\":\"2.0\"}" -H "Content-Type: application/json" -X POST localhost:8545

