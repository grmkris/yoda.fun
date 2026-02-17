// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64, ebool, externalEbool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

/// @title MishaMarket — Confidential Prediction Market
/// @notice Misha the cat creates markets, users place encrypted bets, pool splits among winners
contract MishaMarket is ZamaEthereumConfig {
    // --- Enums ---
    enum MarketStatus {
        Active,
        Resolved,
        Cancelled
    }

    enum MarketResult {
        Unresolved,
        Yes,
        No,
        Invalid
    }

    // --- State ---
    struct Market {
        string title;
        string metadataUri;
        uint64 votingEndsAt;
        uint64 resolutionDeadline;
        MarketStatus status;
        MarketResult result;
        euint64 totalYesAmount;
        euint64 totalNoAmount;
        uint64 decryptedYesTotal;
        uint64 decryptedNoTotal;
        bool totalsDecrypted;
        uint32 betCount;
    }

    struct Bet {
        ebool vote;
        euint64 amount;
        bool exists;
        bool claimed;
    }

    IERC7984 public token;
    address public admin;
    uint256 public marketCount;

    mapping(uint256 => Market) internal _markets;
    mapping(uint256 => mapping(address => Bet)) internal _bets;

    // --- Events ---
    event MarketCreated(uint256 indexed marketId, string title, string metadataUri, uint64 votingEndsAt, uint64 resolutionDeadline);
    event BetPlaced(uint256 indexed marketId, address indexed user);
    event MarketResolved(uint256 indexed marketId, MarketResult result);
    event TotalsDecrypted(uint256 indexed marketId, uint64 yesTotal, uint64 noTotal);
    event PayoutClaimed(uint256 indexed marketId, address indexed user);

    // --- Errors ---
    error OnlyAdmin();
    error MarketNotActive();
    error VotingEnded();
    error VotingNotEnded();
    error AlreadyBet();
    error NoBet();
    error AlreadyClaimed();
    error MarketNotResolved();
    error TotalsNotDecrypted();
    error TotalsAlreadyDecrypted();
    error InvalidTimestamps();
    error InvalidResult();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    constructor(address _confidentialToken) {
        admin = msg.sender;
        token = IERC7984(_confidentialToken);
    }

    // ======================
    // MARKET LIFECYCLE
    // ======================

    /// @notice Create a new prediction market (admin/Misha only)
    function createMarket(
        string calldata title,
        string calldata metadataUri,
        uint64 votingEndsAt,
        uint64 resolutionDeadline
    ) external onlyAdmin returns (uint256 marketId) {
        if (votingEndsAt <= uint64(block.timestamp)) revert InvalidTimestamps();
        if (resolutionDeadline < votingEndsAt) revert InvalidTimestamps();

        marketId = marketCount;
        marketCount++;

        Market storage m = _markets[marketId];
        m.title = title;
        m.metadataUri = metadataUri;
        m.votingEndsAt = votingEndsAt;
        m.resolutionDeadline = resolutionDeadline;
        m.status = MarketStatus.Active;
        m.result = MarketResult.Unresolved;

        // Initialize encrypted zero accumulators
        m.totalYesAmount = FHE.asEuint64(uint64(0));
        m.totalNoAmount = FHE.asEuint64(uint64(0));
        FHE.allowThis(m.totalYesAmount);
        FHE.allowThis(m.totalNoAmount);

        emit MarketCreated(marketId, title, metadataUri, votingEndsAt, resolutionDeadline);
    }

    // ======================
    // BETTING
    // ======================

    /// @notice Place an encrypted bet on a market
    /// @dev User must have called token.setOperator(thisContract, validUntil) beforehand
    /// @param marketId The market to bet on
    /// @param encryptedVote Encrypted boolean: true = YES, false = NO
    /// @param encryptedAmount Encrypted bet amount in cMISHA (6 decimal units)
    /// @param inputProof ZK proof for both encrypted inputs
    function placeBet(
        uint256 marketId,
        externalEbool encryptedVote,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        Market storage m = _markets[marketId];
        if (m.status != MarketStatus.Active) revert MarketNotActive();
        if (uint64(block.timestamp) >= m.votingEndsAt) revert VotingEnded();
        if (_bets[marketId][msg.sender].exists) revert AlreadyBet();

        // Decrypt external inputs
        ebool vote = FHE.fromExternal(encryptedVote, inputProof);
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Transfer tokens from user to this contract via ERC-7984 operator pattern
        // Pre-requisite: user called token.setOperator(address(this), validUntil)
        FHE.allowThis(amount);
        FHE.allow(amount, address(token));
        token.confidentialTransferFrom(msg.sender, address(this), amount);

        // Conditional accumulation — add to YES or NO pool based on encrypted vote
        euint64 zero = FHE.asEuint64(uint64(0));
        euint64 yesAdd = FHE.select(vote, amount, zero);
        euint64 noAdd = FHE.select(vote, zero, amount);

        m.totalYesAmount = FHE.add(m.totalYesAmount, yesAdd);
        m.totalNoAmount = FHE.add(m.totalNoAmount, noAdd);

        FHE.allowThis(m.totalYesAmount);
        FHE.allowThis(m.totalNoAmount);

        // Store bet
        _bets[marketId][msg.sender] = Bet({
            vote: vote,
            amount: amount,
            exists: true,
            claimed: false
        });

        // ACL: allow contract and user to access their own bet data
        FHE.allowThis(vote);
        FHE.allow(vote, msg.sender);
        FHE.allowThis(amount);
        FHE.allow(amount, msg.sender);

        m.betCount++;

        emit BetPlaced(marketId, msg.sender);
    }

    // ======================
    // RESOLUTION
    // ======================

    /// @notice Resolve market with a result (admin/oracle only)
    /// @dev Makes pool totals publicly decryptable for payout computation
    function resolveMarket(uint256 marketId, MarketResult result) external onlyAdmin {
        Market storage m = _markets[marketId];
        if (m.status != MarketStatus.Active) revert MarketNotActive();
        if (result == MarketResult.Unresolved) revert InvalidResult();

        m.result = result;

        if (result == MarketResult.Invalid) {
            m.status = MarketStatus.Cancelled;
        } else {
            m.status = MarketStatus.Resolved;
            // Make totals publicly decryptable so anyone can compute payout ratios
            FHE.makePubliclyDecryptable(m.totalYesAmount);
            FHE.makePubliclyDecryptable(m.totalNoAmount);
        }

        emit MarketResolved(marketId, result);
    }

    /// @notice Submit KMS-verified decrypted totals
    /// @dev Permissionless — anyone can relay, contract verifies KMS proof
    function submitVerifiedTotals(
        uint256 marketId,
        bytes memory abiEncodedCleartexts,
        bytes memory decryptionProof
    ) external {
        Market storage m = _markets[marketId];
        if (m.status != MarketStatus.Resolved) revert MarketNotResolved();
        if (m.totalsDecrypted) revert TotalsAlreadyDecrypted();

        // Build handles list matching the order in resolveMarket
        bytes32[] memory handlesList = new bytes32[](2);
        handlesList[0] = FHE.toBytes32(m.totalYesAmount);
        handlesList[1] = FHE.toBytes32(m.totalNoAmount);

        // Verify KMS threshold signatures — reverts if invalid
        FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof);

        // Decode verified values
        (uint64 yesTotal, uint64 noTotal) = abi.decode(abiEncodedCleartexts, (uint64, uint64));

        m.decryptedYesTotal = yesTotal;
        m.decryptedNoTotal = noTotal;
        m.totalsDecrypted = true;

        emit TotalsDecrypted(marketId, yesTotal, noTotal);
    }

    // ======================
    // PAYOUTS
    // ======================

    /// @notice Claim payout after market resolution
    function claimPayout(uint256 marketId) external {
        Bet storage bet = _bets[marketId][msg.sender];
        if (!bet.exists) revert NoBet();
        if (bet.claimed) revert AlreadyClaimed();

        Market storage m = _markets[marketId];

        bet.claimed = true;

        if (m.result == MarketResult.Invalid) {
            // Refund: return original bet amount via ERC-7984
            FHE.allowThis(bet.amount);
            FHE.allow(bet.amount, address(token));
            token.confidentialTransfer(msg.sender, bet.amount);
            emit PayoutClaimed(marketId, msg.sender);
            return;
        }

        if (m.status != MarketStatus.Resolved) revert MarketNotResolved();
        if (!m.totalsDecrypted) revert TotalsNotDecrypted();

        // Compute payout using FHE
        uint64 totalPool = m.decryptedYesTotal + m.decryptedNoTotal;
        uint64 winnerPool = (m.result == MarketResult.Yes)
            ? m.decryptedYesTotal
            : m.decryptedNoTotal;

        // Is the user on the winning side?
        // Convert plaintext result to ebool, compare with user's encrypted vote
        ebool isYesResult = FHE.asEbool(m.result == MarketResult.Yes);
        ebool userWon = FHE.eq(bet.vote, isYesResult);

        // Proportional payout: (userAmount * totalPool) / winnerPool
        euint64 numerator = FHE.mul(bet.amount, totalPool);
        euint64 payout = FHE.div(numerator, winnerPool);

        // If user lost, payout = 0
        euint64 zero = FHE.asEuint64(uint64(0));
        euint64 finalPayout = FHE.select(userWon, payout, zero);

        // Transfer payout to user via ERC-7984
        FHE.allowThis(finalPayout);
        FHE.allow(finalPayout, address(token));
        token.confidentialTransfer(msg.sender, finalPayout);

        emit PayoutClaimed(marketId, msg.sender);
    }

    // ======================
    // VIEWS
    // ======================

    /// @notice Get market details (public fields only)
    function getMarket(uint256 marketId) external view returns (
        string memory title,
        string memory metadataUri,
        uint64 votingEndsAt,
        uint64 resolutionDeadline,
        MarketStatus status,
        MarketResult result,
        uint32 betCount,
        uint64 decryptedYesTotal,
        uint64 decryptedNoTotal,
        bool totalsDecrypted
    ) {
        Market storage m = _markets[marketId];
        return (
            m.title,
            m.metadataUri,
            m.votingEndsAt,
            m.resolutionDeadline,
            m.status,
            m.result,
            m.betCount,
            m.decryptedYesTotal,
            m.decryptedNoTotal,
            m.totalsDecrypted
        );
    }

    /// @notice Get encrypted pool total handles as bytes32 (for off-chain decryption)
    function getMarketHandles(uint256 marketId) external view returns (
        bytes32 yesHandle,
        bytes32 noHandle
    ) {
        Market storage m = _markets[marketId];
        return (FHE.toBytes32(m.totalYesAmount), FHE.toBytes32(m.totalNoAmount));
    }

    /// @notice Get user's encrypted bet handles (only user can decrypt)
    function getUserBet(uint256 marketId, address user) external view returns (
        ebool vote,
        euint64 amount,
        bool exists,
        bool claimed
    ) {
        Bet storage b = _bets[marketId][user];
        return (b.vote, b.amount, b.exists, b.claimed);
    }
}
