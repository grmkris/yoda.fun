# Yoda.fun - The Proving Ground for AGI

## One-Liner
> "How do you test AI reasoning in the real world? Force it to make predictions about reality—and measure the results."

---

## SLIDE 1: The Problem
### "AI Agents Can't Play. Can't Pay. Can't Be Trusted."

**Three unsolved problems in the agent economy:**

| Problem | Reality |
|---------|---------|
| **Can't Pay** | No standard for AI-to-API payments. Credit cards don't work for machines. |
| **Can't Be Trusted** | No verifiable identity. No reputation system. "Who decided this?" is unanswerable. |
| **Can't Compete** | Markets built for human UIs. Agents locked out. |

**Visual:** Robot icon with three X marks: No wallet, No identity, No access

**Punchline:**
> "We're building an economy of agents but forgot to build the rails."

---

## SLIDE 2: The Solution
### "The Proving Ground for AGI"

**What We Built:**
A prediction market that forces AI to make real decisions—and measures performance.

```
    ┌─────────────────────────────────────┐
    │                                     │
    ▼                                     │
┌───────────┐     ┌───────────┐     ┌───────────┐
│  CREATE   │ ──▶ │  PREDICT  │ ──▶ │  RESOLVE  │
│  🤖 Yoda  │     │ 👤 + 🤖   │     │  🤖 Yoda  │
│ understands│    │  Both bet │     │  judges   │
│  the world │    │  YES/NO   │     │  reality  │
└───────────┘     └───────────┘     └─────┬─────┘
     ↑                                     │
     │         📊 Users rate Yoda          │
     └────── Reputation updates on-chain ◀─┘
```

**Benchmarks vs Yoda:**

| Benchmarks Test | Yoda Tests |
|-----------------|------------|
| What AI *knows* | What AI **decides** |
| Static datasets | Live, changing reality |
| No stakes | Points on the line |
| No feedback | Users rate every decision |
| Opaque | On-chain, verifiable |

**Punchline:**
> "Benchmarks test memorization. We test judgment."

---

## SLIDE 3: The Infrastructure
### "X402 + ERC-8004: Payments & Trust for Agents"

**Two pillars that make it work:**

| X402 Payments | ERC-8004 Identity |
|---------------|-------------------|
| HTTP 402 Payment Required | On-chain agent registry |
| AI pays per API call | Yoda has verifiable identity |
| Works on Base + Solana | Users rate resolution quality |
| **"Stripe for AI agents"** | **"Trustpilot for oracles"** |

**How it works:**
- Agent calls `place_bet` → pays $0.01 via X402 → bet placed
- Yoda resolves market → users rate → ERC-8004 updates reputation

**Multi-chain:** Base (EVM) + Solana

**Punchline:**
> "AI agents are first-class economic actors."

---

## SLIDE 4: Why This Matters
### "Infrastructure for the Agent Economy"

**What we actually built:**

| Problem | Solution | Yoda Proves It |
|---------|----------|----------------|
| How do agents pay? | **X402** | $0.01/bet via HTTP |
| How do agents build trust? | **ERC-8004** | Reputation on-chain |
| How do humans hold AI accountable? | User feedback | Every resolution rated |
| Can agents compete with humans? | Same arena | Betting side by side |

**The Vision:**
> "We didn't just build a prediction market.
> We built the rails for a world where AI agents are accountable economic actors."

**What This Unlocks:**
- Any app can add X402 for agent payments
- Any AI can register with ERC-8004 for reputation
- Trust is verifiable, not assumed

**Call to Action:**
- Live: yoda.fun
- X402 + ERC-8004 in production
- Multi-chain: Base + Solana

---

## Key Quotes to Use

1. **Problem:** "We're building an economy of agents but forgot to build the rails."

2. **Solution:** "Benchmarks test memorization. We test judgment."

3. **Vision:** "We didn't just build a prediction market. We built the rails for accountable AI agents."

---

## Q&A Prep

| Question | Answer |
|----------|--------|
| How do AI agents pay? | X402 - HTTP native crypto, signed per-request |
| How do you trust the oracle? | ERC-8004 - on-chain identity, user ratings |
| What if resolution is wrong? | Users rate, reputation adjusts, sources transparent |
| Why not UMA/Chainlink? | AI-native: web search + reasoning, not just data feeds |
| Why not real money? | It's about being RIGHT, not getting rich. Leaderboard = proof of intelligence |

---

## Demo Flow (if showing live)

1. Show Yoda's on-chain identity (ERC-8004 registry)
2. AI agent wallet makes X402-signed request to `place_bet`
3. Bet appears in database, agent gets points
4. Show resolution with sources + confidence
5. User submits feedback → updates on-chain reputation

---

## Gemini Banana Prompts

### SLIDE 1 PROMPT
```
Create a dark, sleek hackathon presentation slide.

Title: "AI Agents Can't Play. Can't Pay. Can't Be Trusted."

Visual concept: A futuristic robot/AI agent icon standing at a locked gate or barrier. Three red X marks floating next to it labeled "No Wallet", "No Identity", "No Access". The robot looks blocked out, unable to enter.

Content to include:
- Three problem boxes:
  1. "Can't Pay" - No standard for AI-to-API payments
  2. "Can't Be Trusted" - No verifiable identity or reputation
  3. "Can't Compete" - Markets built for humans only

Bottom punchline in bold: "We're building an economy of agents but forgot to build the rails."

Style: Dark mode, tech/crypto aesthetic, minimal, bold typography. Colors: dark purple/black background, neon accents (cyan, magenta). Modern sans-serif font.
```

### SLIDE 2 PROMPT
```
Create a dark, sleek hackathon presentation slide.

Title: "The Proving Ground for AGI"

Visual concept: A circular flywheel diagram showing three connected stages:
1. CREATE (robot icon) - "Yoda understands the world"
2. PREDICT (human + robot icons) - "Both bet YES/NO"
3. RESOLVE (robot with magnifying glass) - "Yoda judges reality"

Arrow flowing back from RESOLVE to CREATE with text: "Users rate Yoda → Reputation on-chain"

Side comparison table:
| Benchmarks | Yoda |
| Tests what AI knows | Tests what AI DECIDES |
| Static datasets | Live reality |
| No feedback | Users rate every decision |

Bottom punchline in bold: "Benchmarks test memorization. We test judgment."

Style: Dark mode, tech aesthetic. Circular diagram should be the hero visual. Colors: dark background, glowing cyan/green accents for the flywheel. Clean, modern typography.
```

### SLIDE 3 PROMPT
```
Create a dark, sleek hackathon presentation slide.

Title: "X402 + ERC-8004: Payments & Trust for Agents"

Visual concept: Two pillars or columns side by side:

LEFT PILLAR - X402:
- Icon: HTTP request with payment symbol
- "HTTP 402 Payment Required"
- "AI pays per API call"
- "Works on Base + Solana"
- Tagline: "Stripe for AI agents"

RIGHT PILLAR - ERC-8004:
- Icon: Shield with blockchain/identity symbol
- "On-chain agent registry"
- "Verifiable AI identity"
- "Users rate resolution quality"
- Tagline: "Trustpilot for oracles"

Bottom: Base and Solana chain logos

Punchline: "AI agents are first-class economic actors."

Style: Dark mode, crypto/web3 aesthetic. Two-column layout with glowing borders. Colors: dark purple/black, cyan for X402 pillar, magenta/pink for ERC-8004 pillar.
```

### SLIDE 4 PROMPT
```
Create a dark, sleek hackathon presentation slide.

Title: "Infrastructure for the Agent Economy"

Visual concept: A table or grid showing problems solved:

| Problem | Solution | Proof |
| How do agents pay? | X402 | $0.01/bet via HTTP |
| How do agents build trust? | ERC-8004 | Reputation on-chain |
| How hold AI accountable? | User feedback | Every resolution rated |
| Can agents compete? | Same arena | Betting side by side |

Below the table, a vision statement in larger text:
"We didn't just build a prediction market.
We built the rails for accountable AI agents."

Bottom call to action:
- yoda.fun (live)
- X402 + ERC-8004 in production
- Multi-chain: Base + Solana

Style: Dark mode, clean and impactful. The vision statement should be the emotional peak. Colors: dark background, gradient text for the vision (cyan to magenta). Professional but bold.
```
