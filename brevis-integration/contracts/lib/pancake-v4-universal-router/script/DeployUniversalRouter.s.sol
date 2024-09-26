// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "forge-std/console2.sol";
import "forge-std/Script.sol";
import {RouterParameters} from "../src/base/RouterImmutables.sol";
import {UnsupportedProtocol} from "../src/deploy/UnsupportedProtocol.sol";
import {UniversalRouter} from "../src/UniversalRouter.sol";

bytes32 constant SALT = bytes32(uint256(0x00000000000000000000000000000000000000005eb67581652632000a6cbedf));

abstract contract DeployUniversalRouter is Script {
    RouterParameters internal params;
    address internal unsupported;

    address constant UNSUPPORTED_PROTOCOL = address(0);
    bytes32 constant BYTES32_ZERO = bytes32(0);

    error Permit2NotDeployed();

    // set values for params and unsupported
    function setUp() public virtual;

    function run() external returns (UniversalRouter router) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        if (params.permit2 == address(0)) revert Permit2NotDeployed();

        // only deploy unsupported if this chain doesn't already have one
        if (unsupported == address(0)) {
            unsupported = address(new UnsupportedProtocol());
            console2.log("UnsupportedProtocol deployed:", unsupported);
        }

        params = RouterParameters({
            permit2: mapUnsupported(params.permit2),
            weth9: mapUnsupported(params.weth9),
            v2Factory: mapUnsupported(params.v2Factory),
            v3Factory: mapUnsupported(params.v3Factory),
            v3Deployer: mapUnsupported(params.v3Deployer),
            v2InitCodeHash: params.v2InitCodeHash,
            v3InitCodeHash: params.v3InitCodeHash,
            stableFactory: mapUnsupported(params.stableFactory),
            stableInfo: mapUnsupported(params.stableInfo),
            v4Vault: mapUnsupported(params.v4Vault),
            v4ClPoolManager: mapUnsupported(params.v4ClPoolManager),
            v4BinPoolManager: mapUnsupported(params.v4BinPoolManager),
            v3NFTPositionManager: mapUnsupported(params.v3NFTPositionManager),
            v4ClPositionManager: mapUnsupported(params.v4ClPositionManager),
            v4BinPositionManager: mapUnsupported(params.v4BinPositionManager)
        });

        logParams();

        router = new UniversalRouter(params);
        console2.log("Universal Router Deployed:", address(router));
        vm.stopBroadcast();
    }

    function logParams() internal view {
        console2.log("permit2:", params.permit2);
        console2.log("weth9:", params.weth9);
        console2.log("v2Factory:", params.v2Factory);
        console2.log("v3Factory:", params.v3Factory);
        console2.log("v3Deployer:", params.v3Deployer);
        console2.log("v2InitCodeHash:");
        console2.logBytes32(params.v2InitCodeHash);
        console2.log("v3InitCodeHash:");
        console2.logBytes32(params.v3InitCodeHash);
        console2.log("stableFactory:", params.stableFactory);
        console2.log("stableInfo:", params.stableInfo);
        console2.log("v4Vault:", params.v4Vault);
        console2.log("v4ClPoolManager:", params.v4ClPoolManager);
        console2.log("v4BinPoolManager:", params.v4BinPoolManager);
        console2.log("v3NFTPositionManager:", params.v3NFTPositionManager);
        console2.log("v4ClPositionManager:", params.v4ClPositionManager);
        console2.log("v4BinPositionManager:", params.v4BinPositionManager);
    }

    function mapUnsupported(address protocol) internal view returns (address) {
        return protocol == address(0) ? unsupported : protocol;
    }
}
