// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../lib/Lib.sol";

interface IBrevisApp {
    function callback(bytes32 _requestId, bytes calldata _appCircuitOutput) external;
}
