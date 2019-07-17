# bobtimus

Bobtimus is a _showcase_ implementation of how the [comit node](https://github.com/comit-network/comit-rs/)'s self-descriptive HTTP API can be used to easily automate the execution of [Basic HTLC Atomic Swaps](https://github.com/comit-network/RFCs/blob/master/RFC-003-SWAP-Basic.md).

**This software is not meant to be used on mainnet. Doing so may lead to fund loss.**

Bobtimus features:
- Accept or decline swap requests depending on a configurable rate
- Action the steps to proceed with a swap: fund & redeem HTLCs 
- A standalone Bitcoin wallet that uses bitcoind RPC (do **not** use this as an example of how to write your own Bitcoin Wallet, see [known limitations](#known-limitations))
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
3. Create a config file in the working dir of bobtimus (have a look at `tests/configs` for inspiration)
4. Let's go: `yarn run start`
5. Fund Bitcoin and Ethereum wallets (addresses are printed at the start of the logs)

Note: The `seedWords` present in the config file are used to generate both Bitcoin and Ethereum HD wallets. Hence, Bobtimus will retain its balance even after a restart. 

## Known Limitations

### Bitcoin Wallet (https://github.com/coblox/bobtimus/issues/13)

The Bitcoin Wallet is a Hierarchical Deterministic wallet that uses `bitcoind` RPC command [`scantxoutset`](https://bitcoincore.org/en/doc/0.18.0/rpc/blockchain/scantxoutset/).
This commands returns unspent outputs found in the blockchain for given `scanobjects`.
The `scanobjects` used by Bobtimus are extended public keys, that are derived 1000 times.
`bitcoind` scans the blockchain to find UTXOs for any of these 2000 keys (there are 2 pubkeys).

Moreover, a HD wallet is supposed to only use addresses once. 

Also, all data storage for Bobtimus is done in memory.

This leads to the following limitations:
- At boot time, Bobtimus needs to wait for the first `scantxoutset` call to be finished to know its Bitcoin balance
- The scanning may be long on mainnet
- After more that ~1000 swaps (buying Bitcoin), Bobtimus will not see new incoming Bitcoin funds
- Even if we were to increase the search range, it would only delay the problem and make the `scantxoutset` call longer and longer
- If the output related to the last address used is already spent, at reboot, Bobtimus cannot guess such that such address were used (**spent** output are not returned by `scantxoutset`) and hence will re-use it

Finally, because `scantxoutset` only returns _unspent_ outputs, it is not straightforward (or possible?) to create an algorithm that would progressively scan a limited range of keys at a given time.

If within a given range, let's say scanning key 2000 to 3000, no UTXO is found does it mean that, either:

1. None of the keys from 2000 to 3000 were used and scanning can stop?
2. Keys from 2000 to 3000 were used and scanning should proceed to 3000-4000 range?

Because of this uncertainty, it is not possible to create an algorithm only using `bitcoind` that can certify that all Bitcoin funds are use by Bobtimus.
