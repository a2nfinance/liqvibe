// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CLVolatilePeriodRewardHook} from "../src/pool-cl/CLVolatilePeriodRewardHook.sol";
import {ICLPoolManager} from "pancake-v4-core/src/pool-cl/interfaces/ICLPoolManager.sol";
contract CLHookOPScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        CLVolatilePeriodRewardHook hook = new CLVolatilePeriodRewardHook(
            ICLPoolManager(0x969D90aC74A1a5228b66440f8C8326a8dA47A5F9),
            address(0xF7E9CB6b7A157c14BCB6E6bcf63c1C7c92E952f5),
            "LV Reward Token",
            "LVRT",
            10 ** 13,
            2500,
            3500

        );
        vm.stopBroadcast();
    }
}
