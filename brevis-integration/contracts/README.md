# Pancake v4 hooks template

[`Use this Template`](https://github.com/new?owner=pancakeswap&template_name=pancake-v4-hooks-template&template_owner=pancakeswap)

## Prerequisite

1. Install foundry, see https://book.getfoundry.sh/getting-started/installation

## Running test

1. Install dependencies with `forge install`
2. Run test with `forge test`

## Description

This repository contains example counter hook for both CL and Bin pool types. 

## Deploy
```forge script --chain bsc-testnet --sender 0x7b2eb7cEA81Ea3E257dEEAefBE6B0F6A1b411042 script/CLHookScript.s.sol:CLHookScript --rpc-url $BSC_TESTNET_RPC_URL --broadcast --verify -vvvv```

