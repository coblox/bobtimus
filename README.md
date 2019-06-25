# bobtimus

Bobtimus is a _showcase_ implementation of how the [comit node](https://github.com/comit-network/comit-rs/)'s self-descriptive HTTP API can be used to easily automate the execution of [Basic HTLC Atomic Swaps](https://github.com/comit-network/RFCs/blob/master/RFC-003-SWAP-Basic.md).

**This software is not meant to be used on mainnet. Doing so may lead to fund loss.**

Bobtimus features:
- Accept or decline swap requests depending on a configurable rate
- Action the steps to proceed with a swap: fund & redeem HTLCs 
- A standalone Bitcoin wallet that uses bitcoind RPC (do **not** use this as an example of how to write your own Bitcoin Wallet)
- An Ethereum wallet that uses web3
- Support Bitcoin <-> Ether swaps
- Use fee/gas services to calculate appropriate transaction fees/gas

Planned features:
- ERC20 support (maybe)
- Automatically refund when expiry is reached
- Testnet support 

Feature we will not do:
- Mainnet support 

## Installation

### Dependencies

- [yarn](https://yarnpkg.com/)
- [bitcoind](https://bitcoincore.org/en/download/)
- Ethereum node of your choice
- [comit-rs suite](https://github.com/comit-network/comit-rs/): `comit_node` & `btsieve` configured and running

### Install, configure & run

1. Clone this repo: `git clone https://github.com/coblox/bobtimus.git`
2. Install dependencies: `yarn`
3. Copy the default config file to root: `cp ./tests/configs/default.toml ./config.toml`
4. Modify the appropriate config parameters to ensure Bobtimus can connect to the blockchain nodes
5. [Make up your own seed words](https://duckduckgo.com/?q=generate+BIP39) and update them in the config file
6. Let's go: `DEBUG=bobtimus:* yarn run start`
7. Fund Bitcoin and Ethereum wallets (addresses are printed at the start of the logs)

Note: The `seedWords` present in the config file are used to generate both Bitcoin and Ethereum HD wallets. Hence, Bobtimus will retain its balance even after a restart. 
