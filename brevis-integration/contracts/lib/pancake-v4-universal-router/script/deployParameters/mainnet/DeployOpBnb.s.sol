// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {DeployUniversalRouter} from "../../DeployUniversalRouter.s.sol";
import {RouterParameters} from "../../../src/base/RouterImmutables.sol";

/**
 * Note: As of now, opbnb does not support verify via foundry, so skipping --verify flag
 * forge script script/deployParameters/mainnet/DeployOpBnb.s.sol:DeployOpbnb -vvv \
 *     --rpc-url $RPC_URL \
 *     --broadcast \
 *     --slow
 */
contract DeployOpbnb is DeployUniversalRouter {
    function setUp() public override {
        params = RouterParameters({
            permit2: 0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768,
            weth9: 0x4200000000000000000000000000000000000006,
            v2Factory: 0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E,
            v3Factory: 0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865,
            v3Deployer: 0x41ff9AA7e16B8B1a8a8dc4f0eFacd93D02d071c9,
            v2InitCodeHash: 0x57224589c67f3f30a6b0d7a1b54cf3153ab84563bc609ef41dfb34f8b2974d2d,
            v3InitCodeHash: 0x6ce8eb472fa82df5469c6ab6d485f17c3ad13c8cd7af59b3d4a8026c5ce0f7e2,
            stableFactory: UNSUPPORTED_PROTOCOL,
            stableInfo: UNSUPPORTED_PROTOCOL,
            v4Vault: UNSUPPORTED_PROTOCOL,
            v4ClPoolManager: UNSUPPORTED_PROTOCOL,
            v4BinPoolManager: UNSUPPORTED_PROTOCOL,
            v3NFTPositionManager: UNSUPPORTED_PROTOCOL,
            v4ClPositionManager: UNSUPPORTED_PROTOCOL,
            v4BinPositionManager: UNSUPPORTED_PROTOCOL
        });

        unsupported = 0xFE6508f0015C778Bdcc1fB5465bA5ebE224C9912;
    }
}
