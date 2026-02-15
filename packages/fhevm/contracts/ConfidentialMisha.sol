// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {MishaToken} from "./MishaToken.sol";

/// @title ConfidentialMisha — Confidential ERC-20 wrapper for $MISHA
/// @notice Wrap standard $MISHA into encrypted $cMISHA for private betting.
///         Unwrap back to standard $MISHA when exiting the private world.
contract ConfidentialMisha is ZamaEthereumConfig {
    string public constant name = "Confidential Misha";
    string public constant symbol = "cMISHA";
    uint8 public constant decimals = 0;

    MishaToken public underlying;

    /// @notice 1 cMISHA = 1e18 wei MISHA (1 whole token)
    uint256 public constant SCALING_FACTOR = 1e18;

    mapping(address => euint64) internal _balances;
    mapping(address => mapping(address => euint64)) internal _allowances;

    event Transfer(address indexed from, address indexed to);
    event Approval(address indexed owner, address indexed spender);
    event Wrap(address indexed user, uint256 amount);
    event Unwrap(address indexed user, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();

    constructor(address _underlying) {
        underlying = MishaToken(_underlying);
    }

    // ======================
    // WRAP / UNWRAP BRIDGE
    // ======================

    /// @notice Lock standard $MISHA and mint encrypted $cMISHA
    /// @dev Caller must have approved this contract on MishaToken first
    /// @param amount Number of whole MISHA tokens to wrap (1 = 1 MISHA = 1e18 wei)
    function wrap(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();

        // Lock standard ERC-20 tokens in this contract (convert to wei)
        underlying.transferFrom(msg.sender, address(this), amount * SCALING_FACTOR);

        // Mint encrypted balance (in whole token units)
        euint64 encAmount = FHE.asEuint64(uint64(amount));

        if (FHE.isInitialized(_balances[msg.sender])) {
            _balances[msg.sender] = FHE.add(_balances[msg.sender], encAmount);
        } else {
            _balances[msg.sender] = encAmount;
        }

        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);

        emit Wrap(msg.sender, amount);
        emit Transfer(address(0), msg.sender);
    }

    /// @notice Burn encrypted $cMISHA and release standard $MISHA
    /// @param amount Number of whole cMISHA tokens to unwrap (1 = 1 MISHA = 1e18 wei)
    function unwrap(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();

        // Burn from encrypted balance (reverts on underflow)
        euint64 encAmount = FHE.asEuint64(uint64(amount));
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], encAmount);

        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);

        // Release standard ERC-20 tokens (convert back to wei)
        underlying.transfer(msg.sender, amount * SCALING_FACTOR);

        emit Unwrap(msg.sender, amount);
        emit Transfer(msg.sender, address(0));
    }

    // ======================
    // CONFIDENTIAL ERC-20
    // ======================

    /// @notice Transfer encrypted amount to recipient
    function transfer(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool) {
        if (to == address(0)) revert ZeroAddress();

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice Approve spender for encrypted allowance
    function approve(
        address spender,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool) {
        if (spender == address(0)) revert ZeroAddress();

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        _allowances[msg.sender][spender] = amount;

        FHE.allowThis(_allowances[msg.sender][spender]);
        FHE.allow(_allowances[msg.sender][spender], msg.sender);
        FHE.allow(_allowances[msg.sender][spender], spender);

        emit Approval(msg.sender, spender);
        return true;
    }

    /// @notice Transfer from using allowance (encrypted amounts)
    function transferFrom(
        address from,
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool) {
        if (to == address(0)) revert ZeroAddress();

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        euint64 currentAllowance = _allowances[from][msg.sender];
        _allowances[from][msg.sender] = FHE.sub(currentAllowance, amount);
        FHE.allowThis(_allowances[from][msg.sender]);
        FHE.allow(_allowances[from][msg.sender], from);
        FHE.allow(_allowances[from][msg.sender], msg.sender);

        _transfer(from, to, amount);
        return true;
    }

    /// @notice Internal transfer using pre-validated euint64 handle
    /// @dev Called by MishaMarket contract to move tokens with already-validated handles
    function transferInternal(address from, address to, euint64 amount) external {
        _transfer(from, to, amount);
    }

    /// @notice Get encrypted balance handle (only owner can decrypt)
    function balanceOf(address account) external view returns (euint64) {
        return _balances[account];
    }

    /// @notice Get encrypted allowance handle
    function allowance(address owner, address spender) external view returns (euint64) {
        return _allowances[owner][spender];
    }

    function _transfer(address from, address to, euint64 amount) internal {
        _balances[from] = FHE.sub(_balances[from], amount);
        FHE.allowThis(_balances[from]);
        FHE.allow(_balances[from], from);

        if (FHE.isInitialized(_balances[to])) {
            _balances[to] = FHE.add(_balances[to], amount);
        } else {
            _balances[to] = amount;
        }
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);

        emit Transfer(from, to);
    }
}
