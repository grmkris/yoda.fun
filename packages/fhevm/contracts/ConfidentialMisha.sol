// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC7984ERC20Wrapper, ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

/// @title ConfidentialMisha — ERC-7984 wrapper for $MISHA
/// @notice Wrap standard $MISHA (18 decimals) into encrypted $cMISHA (6 decimals).
///         Rate = 1e12 (1 cMISHA unit = 1e12 wei MISHA).
///         Uses ERC-7984 operator pattern for MishaMarket transfers.
contract ConfidentialMisha is ERC7984ERC20Wrapper, ZamaEthereumConfig {
    constructor(
        IERC20 token
    ) ERC7984ERC20Wrapper(token) ERC7984("Confidential Misha", "cMISHA", "") {}
}
