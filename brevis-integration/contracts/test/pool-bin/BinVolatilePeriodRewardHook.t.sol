// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {Test} from "forge-std/Test.sol";
import {Currency} from "pancake-v4-core/src/types/Currency.sol";
import {PoolKey} from "pancake-v4-core/src/types/PoolKey.sol";
import {BinPoolParametersHelper} from "pancake-v4-core/src/pool-bin/libraries/BinPoolParametersHelper.sol";
import {BinVolatilePeriodRewardHook} from "../../src/pool-bin/BinVolatilePeriodRewardHook.sol";
import {BinTestUtils} from "./utils/BinTestUtils.sol";
import {PoolIdLibrary} from "pancake-v4-core/src/types/PoolId.sol";
import {IBinRouterBase} from "pancake-v4-periphery/src/pool-bin/interfaces/IBinRouterBase.sol";
import {MockBrevisProof} from "../../src/mock/MockBrevisProof.sol";

contract BinVolatilePeriodRewardHookTest is Test, BinTestUtils {
    using PoolIdLibrary for PoolKey;
    using BinPoolParametersHelper for bytes32;

    BinVolatilePeriodRewardHook hook;
    Currency currency0;
    Currency currency1;
    PoolKey key;
    uint24 ACTIVE_ID = 2 ** 23;
    bytes32 private constant VK_HASH =
        0x179a48b8a2a08b246cd51cb7b78143db774a83ff75fad0d39cf0445e16773426;

    MockBrevisProof private brevisProofMock;
    function setUp() public {
        (currency0, currency1) = deployContractsWithTokens();
        brevisProofMock = new MockBrevisProof();
        hook = new BinVolatilePeriodRewardHook(poolManager);

        // create the pool key
        key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            hooks: hook,
            poolManager: poolManager,
            fee: uint24(3000),
            // binstep: 10 = 0.1% price jump per bin
            parameters: bytes32(uint256(hook.getHooksRegistrationBitmap())).setBinStep(10)
        });

        // initialize pool at 1:1 price point (assume stablecoin pair)
        poolManager.initialize(key, ACTIVE_ID, new bytes(0));
    }

    function testLiquidityCallback() public {
        // assertEq(counterHook.beforeMintCount(key.toId()), 0);
        // assertEq(counterHook.afterMintCount(key.toId()), 0);

        // MockERC20(Currency.unwrap(currency0)).mint(address(this), 1 ether);
        // MockERC20(Currency.unwrap(currency1)).mint(address(this), 1 ether);
        // addLiquidity(key, 1 ether, 1 ether, ACTIVE_ID, 3, address(this));

        // assertEq(counterHook.beforeMintCount(key.toId()), 1);
        // assertEq(counterHook.afterMintCount(key.toId()), 1);
    }


}
