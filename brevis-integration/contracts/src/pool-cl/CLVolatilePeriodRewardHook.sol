// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "pancake-v4-core/src/types/PoolKey.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "pancake-v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "pancake-v4-core/src/types/BeforeSwapDelta.sol";
import {PoolId, PoolIdLibrary} from "pancake-v4-core/src/types/PoolId.sol";
import {BalanceDeltaLibrary, BalanceDelta} from "pancake-v4-core/src/types/BalanceDelta.sol";
import {ICLPoolManager} from "pancake-v4-core/src/pool-cl/interfaces/ICLPoolManager.sol";
import {ERC20} from "pancake-v4-core/lib/solmate/src/tokens/ERC20.sol";

import {CLBaseHook} from "./CLBaseHook.sol";
import "../framework/BrevisApp.sol";
import "../interface/IBrevisProof.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {console} from "forge-std/console.sol";

/// @notice CLCounterHook is a contract that counts the number of times a hook is called
/// @dev note the code is not production ready, it is only to share how a hook looks like
contract CLVolatilePeriodRewardHook is CLBaseHook, BrevisApp, Ownable, ERC20 {
    using PoolIdLibrary for PoolKey;
    using BalanceDeltaLibrary for BalanceDelta;

    event VolatilityUpdated(uint256 mean, uint256 sigma);

    bytes32 public vkHash;
    uint256 public mean;
    uint256 public sigma;
    // Base reward points for every adding liquidity actions.
    uint256 public baseRewardPoints;
    // To calculate reward points if sqrtPriceX96 is in range of bollinger bands
    // alpha0 = 250 => ratio = alpha0 / DENOMINATOR = 0.025 (2.5%)
    uint256 public alpha0;
    // To calculate reward points if sqrtPriceX96 is out of range of bollinger bands
    uint256 public alpha1;
    uint256 public constant DENOMINATOR = 10000;

    constructor(
        ICLPoolManager _poolManager,
        address _brevisRequest,
        string memory _name,
        string memory _symbol,
        uint256 _baseRewardPoints,
        uint256 _alpha0,
        uint256 _alpha1
    )
        CLBaseHook(_poolManager)
        BrevisApp(_brevisRequest)
        Ownable(msg.sender)
        ERC20(_name, _symbol, 18)
    {
        baseRewardPoints = _baseRewardPoints;
        alpha0 = _alpha0;
        alpha1 = _alpha1;
    }

    function getHooksRegistrationBitmap()
        external
        pure
        override
        returns (uint16)
    {
        return
            _hooksRegistrationBitmapFrom(
                Permissions({
                    beforeInitialize: false,
                    afterInitialize: false,
                    beforeAddLiquidity: false,
                    afterAddLiquidity: true,
                    beforeRemoveLiquidity: false,
                    afterRemoveLiquidity: false,
                    beforeSwap: false,
                    afterSwap: false,
                    beforeDonate: false,
                    afterDonate: false,
                    beforeSwapReturnsDelta: false,
                    afterSwapReturnsDelta: false,
                    afterAddLiquidityReturnsDelta: false,
                    afterRemoveLiquidityReturnsDelta: false
                })
            );
    }

    function afterAddLiquidity(
        address sender,
        PoolKey calldata key,
        ICLPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta delta,
        bytes calldata hookData
    ) external override poolManagerOnly returns (bytes4, BalanceDelta) {
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(key.toId());

        uint256 deltaAmount0 = uint256(int256(-delta.amount0()));
        _assignPoints(sender, deltaAmount0, uint256(sqrtPriceX96));

        return (
            this.afterAddLiquidity.selector,
            BalanceDeltaLibrary.ZERO_DELTA
        );
    }

    // BrevisQuery contract will call our callback once Brevis backend submits the proof.
    function handleProofResult(
        bytes32 _vkHash,
        bytes calldata _circuitOutput
    ) internal override {
        // We need to check if the verifying key that Brevis used to verify the proof generated by our circuit is indeed
        // our designated verifying key. This proves that the _circuitOutput is authentic
        require(vkHash == _vkHash, "invalid vk");

        (mean, sigma) = _decodeOutput(_circuitOutput);

        emit VolatilityUpdated(mean, sigma);
    }

    // handle optimistic proof result.
    // This example handles optimistic result in the same way as handling zk results,
    // your app can choose to do differently.
    function handleOpProofResult(bytes32 _vkHash, bytes calldata _circuitOutput) internal override {
        handleProofResult(_vkHash, _circuitOutput);
    }

    function _assignPoints(
        address sender,
        uint256 deltaAmount0,
        uint256 sqrtPriceX96
    ) internal {
        uint256 rewardPoints = 0;
        uint256 absOfPriceSubMean = _abs(sqrtPriceX96, mean);
        // console.log("SQRTPRICEX96:%d, MEAN: %d", sqrtPriceX96, mean);
        // Average volatile: sqrtPriceX96 is in two limited bands.
        // rewardPoints = baseRewardPoints + alpha * sqrt(delta) * (|price - mean| / sigma)
        if (
            sqrtPriceX96 <= (mean + 2 * sigma) &&
            sqrtPriceX96 >= (mean - 2 * sigma)
        ) {
            rewardPoints =
                baseRewardPoints +
                (alpha0 *
                    _sqrt(deltaAmount0) *
                    ((absOfPriceSubMean * DENOMINATOR) / sigma)) /
                (DENOMINATOR * DENOMINATOR);
            // console.log("Calculated params:%d %d", _sqrt(deltaAmount0), (absOfPriceSubMean * DENOMINATOR) / sigma);
        } else {
            // High volatile: sqrtPriceX96 is out out two bands
            rewardPoints =
                baseRewardPoints +
                (alpha1 *
                    _sqrt(deltaAmount0) *
                    ((absOfPriceSubMean * DENOMINATOR) / sigma)) /
                (DENOMINATOR * DENOMINATOR);
            //  console.log("Calculated params:%d %d", _sqrt(deltaAmount0), (absOfPriceSubMean * DENOMINATOR) / sigma);
        }
       
        if (rewardPoints > 0) {
            // console.log("Calculated reward points:%d", rewardPoints);
            // console.log("Sender %s:", sender);
            _mint(sender, rewardPoints);
        }
    }

    // In app circuit we have:
    // api.OutputUint(248, vol)
    function _decodeOutput(
        bytes calldata o
    ) internal pure returns (uint256, uint256) {
        uint248 m = uint248(bytes31(o[0:31])); // lowerPrice is output as a uint248 (31 bytes)
        uint248 s = uint248(bytes31(o[31:62]));
        return (uint256(m), uint256(s));
    }

    function setVkHash(bytes32 _vkHash) external onlyOwner {
        vkHash = _vkHash;
    }

    function setBaseRewardPoints(uint256 _baseRewardPoints) external onlyOwner {
        baseRewardPoints = _baseRewardPoints;
    }

    function setAlpha0(uint256 _alpha0) external onlyOwner {
        alpha0 = _alpha0;
    }

    function setAlpha1(uint256 _alpha1) external onlyOwner {
        alpha1 = _alpha1;
    }

    function _abs(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a >= b) {
            return (a - b);
        }

        return b - a;
    }

    // Use Babylon methods
    function _sqrt(uint x) internal pure returns (uint y) {
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }


    /**
     * @notice config params to handle optimitic proof result
     * @param _challengeWindow The challenge window to accept optimistic result. 0: POS, maxInt: disable optimistic result
     * @param _sigOption bitmap to express expected sigs: bit 0 is bvn, bit 1 is avs
     */
    function setBrevisOpConfig(uint64 _challengeWindow, uint8 _sigOption) external onlyOwner {
        brevisOpConfig = BrevisOpConfig(_challengeWindow, _sigOption);
    }
}
