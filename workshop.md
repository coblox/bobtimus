# Workshop setup

1. `docker-compose up -d`
2. Update slides/Slack with parity/bitcoind details
3. `btsieve --config ./btsieve.toml`
4. `comit_node`
5. Start bobtimus: `DEBUG=bobtimus:* yarn run start`
6. Fund bobtimus
   - bitcoin:
     - `alias btc-cli='docker exec -it bobtimus_bitcoind_1 bitcoin-cli -regtest -rpcport=18443 -rpcuser=bitcoin -rpcpassword=54pLR_f7-G6is32LP-7nbhzZSbJs_2zSATtZV_r05yg='`
     - `btc-cli generate 101`
     - `btc-cli sendtoaddress address amount` (the address is printed when starting bobtimus)
   - ethereum: `./fund_ether.sh address` (the address is printed when starting bobtimus)
7. Run regular generation of blocks for bitcoin: `while true; do btc-cli generate 1; sleep 60; done`
8. Create link to buy Bitcoin with Ether for participants:
   - Alpha Ether, Beta Bitcoin
   - rate is 1 Bitcoin 10 Ether
   - 0.1 Bitcoin for 1 Ether 
   - 10000000 sats for 1000000000000000000 Wei
9. Create link to buy Ether with Bitcoin for participants:
   - Alpha Bitcoin, Bitcoin Ether
   - rate is 1 Bitcoin 10 Ether
   - 0.01 Bitcoin for 0.1 Ether 
   - 1000000 sats for 100000000000000000 Wei