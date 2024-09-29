### 0. Vision
Using the Bollinger Bands concept to calculate volatility and reward token amounts for liquidity addition with Pancake v4 hooks and Brevis.

### 1. Overview

Our project uses the Brevis SDK and services to generate proofs for calculated results. These results, including the mean and standard deviation, will be used in V4 Hooks to determine volatile periods and generate reward token amounts.

### 2. Demo information 
- [Video demo]()
- [Github](https://github.com/a2nfinance/liqvibe)
- [CLVolatilePeriodRewardHook](https://testnet.bscscan.com/address/0xd7e3E9EDd7f363A6649e78957edaA0B0a3482B11#code)
- [Updating Volatility Events](https://testnet.bscscan.com/address/0xd7e3E9EDd7f363A6649e78957edaA0B0a3482B11#events)

### 3. Technical solution.
LiqVibe implements two solutions to calculate the mean and standard deviation of a list of historical sqrtPriceX96:
- **Use storage slot data** from the Pancake V3 pool contract. This solution works on both the testnet and mainnet of BSC and Ethereum. However, it is difficult to use with the Pancake V4 Pool Manager.
- **Use swap event logs** from the V3 pool contract or V4 Pool Manager. This solution can integrate with both V3 and V4. However, as of now, the V4 Pool Manager is only available on the testnet.

LiqVibe uses a formula to calculate the reward token amount when a user adds liquidity:

- Reward tokens = base_reward_points + alpha * sqrt(deltaAmount) * |sqrtPriceX96 - mean| / sigma.

- When sqrtPriceX96 is within the two bands, alpha = alpha0. When sqrtPriceX96 is outside the two bands, alpha = alpha1. These settings can be updated by the hookContract owner.



### 4. Coding

LiqVibe references many open-source and outdated examples, most of which are not integrated with Brevis or use incorrect RPC providers.

LiqVibe's source code has been reorganized, reducing bugs and supporting more options to test with other EVM blockchains and V3/V4 smart contracts.

Our Brevis app supports the following configuration:

- Source chains: Ethereum mainnet, BSC mainnet, Sepolia, BSC testnet
- Destination chains: Sepolia, BSC testnet (V4 hooks on testnets only)

Developers only need the chain configuration to test.

### 5. Challenges we ran into
- **Challenge 01 - System architecture:** V4 Hooks and Brevis are entirely new technologies, and we had to spend over a week before writing the first line of code. We encountered numerous problems and unfamiliar errors with Go, Solidity, and local services. We decided to write small code blocks and test them before moving on to the next feature.

- **Challenge 02 - Brevis Integration:** After successfully running all test scripts, we wanted to test on the real system. This proved challenging due to issues, such as invalid storage slots and invalid receipt info errors. Brevis provided support throughout the day to help resolve each problem.



### 6. Future Development
We now understand how to integrate Brevis with V4 Hooks, and this has opened up a huge number of possibilities. In the near future, we plan to develop a UI tool to support V4 Hook development on both testnets and mainnets.

### 7. Conclusion
We extend special thanks to Brevis, the hackathon workshops, open-source resources, and the supportive community on the Brevis Telegram channel. Without their contributions, we wouldn't have been able to complete our product on time.
