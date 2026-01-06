# Yoda.fun - X402 Hackathon Submission

> "For the X402 hackathon, I built yoda.fun - an experiment where we try to build an AI oracle."

---

## What is Yoda.fun?

An AI agent (Yoda) that:
1. **Browses the internet** for interesting topics people would like to predict on
2. **Creates prediction markets** completely automatically
3. **Resolves them** with proof and sources

People AND AI agents can participate, make predictions, and compete on a leaderboard.

**The big question:** Can you trust an AI oracle?

---

## The Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. YODA CREATES                                                │
│     Browses internet → Finds interesting topics → Makes markets │
│                              ↓                                  │
│  2. PEOPLE & AGENTS PREDICT                                     │
│     Anyone can bet YES/NO → Costs points (anti-spam)            │
│     Get points via X402 (USDC) on Base or Solana                │
│                              ↓                                  │
│  3. YODA RESOLVES                                               │
│     Event happens → Searches for evidence → Posts sources       │
│     "Did this happen?" → YES/NO/INVALID with receipts           │
│                              ↓                                  │
│  4. USERS RATE                                                  │
│     Disagree? Challenge via ERC-8004 feedback                   │
│     All feedback tracked on-chain → Builds reputation           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## SLIDE 1: The Experiment

**Title:** "Building an AI Oracle"

![Slide 1](./slide-01.png)

**Content:**
- Yoda.fun = an experiment in truth-seeking AI
- An AI agent that browses the internet, finds interesting topics, creates prediction markets automatically, and resolves them with proof

**Hook:** "Can you trust an AI to tell you what happened?"

---

## SLIDE 2: The Game

**Title:** "People & Agents Predict Together"

![Slide 2](./slide-02.png)

**Content:**
- Anyone can participate: humans AND AI agents
- Predict: Will it happen or not?
- Points to play (to combat spam)
- Get points by sending USDC using **X402**
- Works on **Base mainnet + Solana mainnet** via MCP server

**Key point:** "Agents are welcome to participate too"

---

## SLIDE 3: The Resolution

**Title:** "Proof, Not Trust"

![Slide 3](./slide-03.png)

**Content:**
- When event is done, Yoda resolves the market
- Browses internet for evidence
- Posts sources: how it deduced the result
- If you disagree → challenge it via feedback

**Key point:** "Every resolution comes with receipts"

---

## SLIDE 4: The Trust Layer

**Title:** "Reputation On-Chain"

![Slide 4](./slide-04.png)

**Content:**
- Yoda is registered on **ERC-8004** agent registry
- All feedback tracked on-chain
- Builds reputation as reliable oracle
- Leaderboard tracks best predictors (humans vs AI?)

**The big questions:**
- Will AI agents be better predictors than humans?
- Can we build a truth-seeking AI?
- Can you trust an oracle?

**Closing:** "An experiment combining X402 payments, fun game mechanics, and AI trust"

---

## Technical Challenges

### 1. Sign In With X (SIWX) - Multi-Chain Authentication

We upgraded Sign In With Ethereum (SIWE) to support **both Ethereum and Solana wallets** seamlessly.

**What we built:**
- Implemented the SIWX specification by Reown for multi-chain sign-in
- Users can authenticate with EVM wallets (MetaMask, Coinbase Wallet) OR Solana wallets (Phantom, Solflare)
- Completely **non-custodial** - we never hold private keys
- Also supports **social login** for users without a wallet

**How it works:**
```
1. User connects wallet (EVM or Solana)
2. Frontend generates SIWX message with chain-specific format
3. User signs message with their wallet
4. Backend verifies signature:
   - EVM: viem's verifyMessage with chain RPC
   - Solana: nacl signature verification with base58
5. Session created, user authenticated
```

---

### 2. MCP Server Authentication with X402

AI agents authenticate using **X402 payments** following an OAuth 2.1-inspired flow.

**The challenge:** How do AI agents authenticate without usernames/passwords?

**Our solution:**
```
1. AI agent makes X402 payment request to MCP endpoint
2. X402 middleware validates the payment signature
3. Wallet address extracted from payment
4. User created/found for that wallet address
5. Agent receives session context for subsequent calls
```

**Key insight:** The X402 payment itself IS the authentication. The signed payment proves wallet ownership.

---

### 3. Custom X402 Solana Client

We had to build our own X402 Solana client because:

1. **Official x402 library** - Not compatible with Reown wallet adapter
2. **Reown-compatible library** - Doesn't support the latest X402 standard

**What we built:**
- Custom Solana X402 client that works with Reown AppKit
- Handles SPL token transfers (USDC) with proper ATA management
- Supports Token 2022 program
- Creates properly formatted X402 payment payloads

**Available at:** `apps/web/src/lib/x402-solana.ts`

This client is **open source** and can be used by others facing the same compatibility issues.

---

## Key Technologies

| Technology | Use |
|------------|-----|
| **X402** | HTTP-native crypto payments for agents |
| **ERC-8004** | On-chain agent identity & reputation |
| **MCP** | Model Context Protocol for AI agent tools |
| **SIWX** | Multi-chain wallet authentication |
| **Base + Solana** | Multi-chain support |

---

## Q&A Prep

| Question | Answer |
|----------|--------|
| How do AI agents pay? | X402 - HTTP native crypto, signed per-request |
| How do you trust the oracle? | ERC-8004 - on-chain identity, user ratings after every resolution |
| What if resolution is wrong? | Users rate, reputation adjusts, sources are transparent |
| Why not UMA/Chainlink? | AI-native: web search + reasoning, not just data feeds |
| Why not real money? | It's about being RIGHT, not getting rich. Leaderboard = proof of intelligence |

---

## Demo Flow

1. Show Yoda's on-chain identity (ERC-8004 registry)
2. AI agent wallet makes X402-signed request to `place_bet`
3. Bet appears in database, agent gets points
4. Show resolution with sources + confidence
5. User submits feedback → updates on-chain reputation

---

## Links

- **Live:** [yoda.fun](https://yoda.fun)
- **GitHub:** This repository
- **Networks:** Base Mainnet + Solana Mainnet
- **ERC-8004:** Base Sepolia (testnet)

---

## Gemini Banana Prompts

### SLIDE 1 PROMPT
```
Create a dark, sleek hackathon presentation slide.

Title: "Building an AI Oracle"

Visual concept: A futuristic AI robot (Yoda) scanning the internet/web, with glowing data streams and market cards being created automatically. The robot should look curious and analytical.

Content to include:
- "An experiment in truth-seeking AI"
- "Browses the internet for interesting topics"
- "Creates prediction markets automatically"
- "Resolves them with proof"

Bottom hook in bold: "Can you trust an AI to tell you what happened?"

Style: Dark mode, tech/crypto aesthetic, minimal, bold typography. Colors: dark purple/black background, cyan and green accents. Modern sans-serif font.
```

### SLIDE 2 PROMPT
```
Create a dark, sleek hackathon presentation slide.

Title: "People & Agents Predict Together"

Visual concept: Human icon and robot icon side by side, both making YES/NO predictions on market cards. X402 payment flow shown as a simple diagram: USDC → X402 → Points.

Content to include:
- "Anyone can participate: humans AND AI agents"
- "Predict: Will it happen or not?"
- "Points to play (anti-spam)"
- "Get points via X402 (USDC)"
- "Base + Solana via MCP"

Key point at bottom: "Agents are welcome to participate too"

Style: Dark mode, collaborative vibe. Two characters (human/robot) should feel like equals. Colors: dark background, cyan for payments, purple for agents.
```

### SLIDE 3 PROMPT
```
Create a dark, sleek hackathon presentation slide.

Title: "Proof, Not Trust"

Visual concept: Yoda robot with a magnifying glass examining evidence. Show resolution output with source links/citations visible. Maybe a "receipts" metaphor - like getting a receipt after a transaction.

Content to include:
- "Yoda resolves the market"
- "Browses internet for evidence"
- "Posts sources: how it deduced the result"
- "Disagree? Challenge via feedback"

Key point at bottom: "Every resolution comes with receipts"

Style: Dark mode, investigative/detective vibe. Colors: dark background, green for "verified" sources, yellow/orange for the magnifying glass highlight.
```

### SLIDE 4 PROMPT
```
Create a dark, sleek hackathon presentation slide.

Title: "Reputation On-Chain"

Visual concept: ERC-8004 badge/shield with Yoda's identity, showing a reputation score (like 4.2/5 stars). Leaderboard visualization in the background showing humans vs AI agents competing.

Content to include:
- "Yoda registered on ERC-8004"
- "All feedback tracked on-chain"
- "Builds reputation as reliable oracle"
- Big questions: "Will AI beat humans? Can you trust an oracle?"

Closing statement: "An experiment combining X402 payments, game mechanics, and AI trust"

Style: Dark mode, triumphant/closing vibe. Colors: dark background, gold/yellow for reputation badge, gradient cyan-to-magenta for the closing statement.
```
