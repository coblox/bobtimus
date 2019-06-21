# bobtimus

Bobtimus is a _show case_ implementation of how the [comit_node](https://github.com/comit-network/comit-rs/) self-descriptive HTTP API can easily be used to automate the execution of atomic swaps. It is a TypeScript (auto)bot that executes [Basic HTLC Atomic Swap](https://github.com/comit-network/RFCs/blob/master/RFC-003-SWAP-Basic.md) requests as _Bob_, as directed by the comit_node..   

**This implementation will never be ready for mainnet, please do not use for mainnet, you will loose funds!**

Bobtimus features:
- Accept or decline swap requests depending on a configurable rate
- Action the steps to proceed with a swap: fund & redeem HTLCs 
- A standalone Bitcoin wallet that uses bitcoind RPC: Do **not** use this as an example on how to write your own Bitcoin Wallet 
- An Ethereum wallet that uses web3: Do **not** use this as an example on how to write your own Ethereum Wallet
- Bitcoin<->Ether swaps support
- Uses fee/gas services to calculate appropriate transaction fees/gas

Planned features:
- ERC20 support (maybe)
- Automatically refund when expiry is reached
- Testnet support 

Features we will not do:
- Mainnet support
- "Production" ready 

## Installation

### Dependencies

- [yarn](https://yarnpkg.com/)
- [bitcoind](https://bitcoincore.org/en/download/)
- Ethereum node of your choice
- [comit-rs suite](https://github.com/comit-network/comit-rs/): `comit_node` & `btsieve` nodes configured and running

### Install, configure & run

1. Clone this repo: `git clone https://github.com/coblox/bobtimus.git`
2. Install dependencies: `yarn`
3. Copy the default config file to root: `cp ./tests/configs/default.toml ./config.toml`
4. Modify the appropriate parameters to ensure bobtimus can connect to the blockchain nodes
5. [Make up your own seed words](https://duckduckgo.com/?q=generate+BIP39) and update them in the config file
6. Let's go: `DEBUG=bobtimus:* yarn run start`
7. Fund Bitcoin and Ethereum wallet, addresses are printed at the start of the logs

Note: the seed is fixed in the config file so Bobtimus will retain the balance even after a restart. 