# Workshop setup

1. `docker-compose up`
2. Update slides/Slack with parity/bitcoind details
3. `btsieve --config ./btsieve.toml`
4. `comit_node`
4. Fund bobtimus
   - bitcoin:
     - `alias btc-cli='docker exec -it bobtimus_bitcoind_1 bitcoin-cli -regtest -rpcport=18443 -rpcuser=bitcoin -rpcpassword=54pLR_f7-G6is32LP-7nbhzZSbJs_2zSATtZV_r05yg='`
     - `btc-cli sendtoaddress address amount`
   - ethereum: `curl --data '{"method":"personal_sendTransaction","params":[{"from":"0x00a329c0648769a73afac7f9381e08fb43dbea72","to":"ETHEREUM_ADDRESS","value":"0xDE0B6B3A7640000"},""],"id":1,"jsonrpc":"2.0"}' -H "Content-Type: application/json" -X POST localhost:8545`
5. Get a Metamask connected to parity and fund it
5. Create link to buy Bitcoin with Ether for participants:
   - Beta Bitcoin, Alpha Ether
   - rate is 1 Bitcoin 100 Ether
   - 0.0001 Bitcoin for 0.1 Ether 
   - 10000 sats for 100000000000000000 Wei
5. run bitcoin generate every 10s