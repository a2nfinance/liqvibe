// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {Test} from "forge-std/Test.sol";
import {Constants} from "pancake-v4-core/test/pool-cl/helpers/Constants.sol";
import {Currency} from "pancake-v4-core/src/types/Currency.sol";
import {PoolKey} from "pancake-v4-core/src/types/PoolKey.sol";
import {Hooks} from "pancake-v4-core/src/libraries/Hooks.sol";
import {CLPoolParametersHelper} from "pancake-v4-core/src/pool-cl/libraries/CLPoolParametersHelper.sol";
import {CLVolatilePeriodRewardHook} from "../../src/pool-cl/CLVolatilePeriodRewardHook.sol";
import {CLTestUtils} from "./utils/CLTestUtils.sol";
import {CLPoolParametersHelper} from "pancake-v4-core/src/pool-cl/libraries/CLPoolParametersHelper.sol";
import {PoolIdLibrary} from "pancake-v4-core/src/types/PoolId.sol";
import {ICLRouterBase} from "pancake-v4-periphery/src/pool-cl/interfaces/ICLRouterBase.sol";
import {MockBrevisProof} from "../../src/mock/MockBrevisProof.sol";
import {console} from "forge-std/console.sol";
import {HookMiner} from "./utils/HookMiner.sol";
import {HOOKS_AFTER_ADD_LIQUIDITY_OFFSET} from "pancake-v4-core/src/pool-cl/interfaces/ICLHooks.sol";

contract CLVolatilePeriodRewardHookTest is Test, CLTestUtils {
    using PoolIdLibrary for PoolKey;
    using CLPoolParametersHelper for bytes32;

    CLVolatilePeriodRewardHook hook;
    Currency currency0;
    Currency currency1;
    PoolKey key;
    bytes32 private constant VK_HASH =
        0x179a48b8a2a08b246cd51cb7b78143db774a83ff75fad0d39cf0445e16773426;

    MockBrevisProof private brevisProofMock;
    function setUp() public {
        (currency0, currency1) = deployContractsWithTokens();
        brevisProofMock = new MockBrevisProof();
        hook = new CLVolatilePeriodRewardHook(
            poolManager,
            address(brevisProofMock),
            "test",
            "TEST",
            10 ** 15,
            250,
            350
        );

        hook.setVkHash(VK_HASH);
        console.logBytes32(bytes32(uint256(hook.getHooksRegistrationBitmap()))
                .setTickSpacing(10));
        // create the pool key
        key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            hooks: hook,
            poolManager: poolManager,
            fee: uint24(3000), // 0.3% fee
            // tickSpacing: 10
            parameters: bytes32(uint256(hook.getHooksRegistrationBitmap()))
                .setTickSpacing(10)
        });
       
        // initialize pool at 1:1 price point (assume stablecoin pair)
        poolManager.initialize(key, Constants.SQRT_RATIO_1_1, new bytes(0));
    }

    function testLiquidityCallback() public {
        uint248 mean = Constants.SQRT_RATIO_1_2;
        uint248 sigma = (Constants.SQRT_RATIO_1_1 - Constants.SQRT_RATIO_1_2) >>
            2;
        brevisProofMock.setMockOutput(
            bytes32(0),
            keccak256(abi.encodePacked(mean, sigma)),
            VK_HASH
        );
        hook.brevisCallback(VK_HASH, abi.encodePacked(mean, sigma));
        assertEq(hook.mean(), mean);
        assertEq(hook.sigma(), sigma);
        MockERC20(Currency.unwrap(currency0)).mint(address(this), 1 ether);
        MockERC20(Currency.unwrap(currency1)).mint(address(this), 1 ether);
        addLiquidity(key, 1 ether, 1 ether, -60, 60, address(this));

        
        // Sender: 0xF62849F9A0B5Bf2913b396098F7c7019b51A820a
        // Address(This): 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496
    
        uint256 rewardPoints = hook.balanceOf(address(this));
        console.log("Reward points %d", rewardPoints);
        

        // uint160 flags = uint160(1 << HOOKS_AFTER_ADD_LIQUIDITY_OFFSET);

        // (, bytes32 salt) = HookMiner.find(
        //     address(this),
        //     flags,
        //     type(CLVolatilePeriodRewardHook).creationCode,
        //     abi.encode(poolManager, address(brevisProofMock))
        // );
        // uint256 liquidity = poolManager.getLiquidity(
        //     key.toId(),
        //     address(this),
        //     -60,
        //     60,
        //     salt
        // );
        // console.log("Liquidity: %s", liquidity);
        uint256 liquidity2 = poolManager.getLiquidity(key.toId());
   
        console.log("Liquidity2: %s", liquidity2);
        // assertGt(rewardPoints, hook.baseRewardPoints());
    }
}
