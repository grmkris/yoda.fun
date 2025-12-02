# Activity & Social System Overview

## System Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend (Next.js)"]
        AF[ActivityFeed.tsx]
        UP[UserProfile.tsx]
        Hooks[useGlobalActivity<br/>useFollowingActivity<br/>useUserActivity]
    end

    subgraph API["API Layer (oRPC)"]
        AR[activity-router.ts]
        FR[follow-router.ts]
    end

    subgraph Services["Service Layer"]
        AS[ActivityService]
        BS[BetService]
        SS[SettlementService]
        FS[FollowService]
        LS[LeaderboardService]
    end

    subgraph DB["Database (PostgreSQL)"]
        ACT[(activity)]
        FOL[(follow)]
        UST[(user_stats)]
        UPR[(user_profile)]
        BET[(bet)]
        MKT[(market)]
    end

    AF --> Hooks
    UP --> Hooks
    Hooks --> AR
    AR --> AS
    FR --> FS

    BS -->|logBetPlaced| AS
    SS -->|logBetResult<br/>logStreakMilestone| AS
    FS -->|logFollowedUser| AS

    AS --> ACT
    FS --> FOL
    LS --> UST
    SS --> BET
    BS --> BET
```

## Data Flow: Bet Placement

```mermaid
sequenceDiagram
    participant U as User
    participant Web as Frontend
    participant API as BetRouter
    participant BS as BetService
    participant AS as ActivityService
    participant DB as Database

    U->>Web: Click "Bet YES"
    Web->>API: POST /bet/place
    API->>BS: placeBet(userId, marketId, YES, amount)

    BS->>DB: BEGIN TRANSACTION
    BS->>DB: Check balance
    BS->>DB: Deduct balance
    BS->>DB: Create bet record
    BS->>DB: Update market vote counts
    BS->>DB: COMMIT

    BS->>AS: logBetPlaced({userId, marketId, marketTitle, amount, vote})
    AS->>DB: INSERT activity (type=BET_PLACED, metadata={...})

    BS-->>API: Return bet record
    API-->>Web: Success response
    Web-->>U: Show confirmation
```

## Data Flow: Market Settlement

```mermaid
sequenceDiagram
    participant Worker as Resolution Worker
    participant SS as SettlementService
    participant LS as LeaderboardService
    participant AS as ActivityService
    participant DB as Database

    Worker->>SS: resolveMarket(marketId, "YES")
    SS->>DB: Update market result
    SS->>DB: Get all active bets

    loop For each winning bet
        SS->>DB: Update bet status=WON
        SS->>DB: Credit user balance
        SS->>DB: Create payout transaction
    end

    loop For each losing bet
        SS->>DB: Update bet status=LOST
    end

    loop For each bet (async)
        SS->>LS: updateStatsOnSettlement(userId, won, profit)
        LS->>DB: Update user_stats
        LS-->>SS: {newCurrentStreak}

        alt Won && Streak is milestone
            SS->>AS: logStreakMilestone(userId, streakCount)
        end

        SS->>AS: logBetResult(userId, marketId, won, payout)
        AS->>DB: INSERT activity
    end
```

## Data Flow: Activity Feed

```mermaid
sequenceDiagram
    participant U as User
    participant Web as ActivityFeed.tsx
    participant Hook as useGlobalActivity
    participant API as ActivityRouter
    participant AS as ActivityService
    participant DB as Database

    U->>Web: Visit /activity
    Web->>Hook: useGlobalActivity({limit: 50})
    Hook->>API: GET /activity/global
    API->>AS: getGlobalFeed({limit, offset})

    AS->>DB: SELECT activity + user<br/>WHERE isPublic=true<br/>AND user profile isPublic=true<br/>ORDER BY createdAt DESC

    DB-->>AS: Activity rows with user info
    AS-->>API: Formatted activities
    API-->>Hook: {activities, limit, offset}
    Hook-->>Web: data

    Web->>Web: Render ActivityCard for each
    Note over Web: Uses metadata to display:<br/>- vote (YES/NO)<br/>- marketTitle<br/>- payout amount<br/>- streakCount<br/>- followedUsername
```

## Activity Types & Metadata Usage

| Type | Metadata Fields Used | Where Displayed |
|------|---------------------|-----------------|
| `BET_PLACED` | `vote`, `marketTitle`, `amount` | "bet YES on 'Will X happen?'" |
| `BET_WON` | `payout`, `marketTitle` | "won $50.00 on 'Will X happen?'" |
| `BET_LOST` | `marketTitle` | "lost on 'Will X happen?'" |
| `STREAK_MILESTONE` | `streakCount` | "reached a 10 win streak" |
| `FOLLOWED_USER` | `followedUsername`, `followedUserId` | "started following @username" |
| `LEADERBOARD_RANK` | `rank`, `period` | (not implemented in UI yet) |
| `PROFILE_UPDATED` | (none) | (not implemented yet) |

## Current Schema: JSONB Metadata

```sql
CREATE TABLE activity (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES user(id),
    type activity_type NOT NULL,
    metadata JSONB,  -- <-- All context here
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**Current metadata shape (TypeScript):**
```typescript
type ActivityMetadata = {
  marketId?: MarketId;
  marketTitle?: string;
  amount?: string;
  payout?: string;
  vote?: "YES" | "NO";
  result?: "WON" | "LOST";
  streakCount?: number;
  rank?: number;
  period?: "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME";
  followedUserId?: UserId;
  followedUsername?: string;
};
```

## Alternative: Explicit Columns

```sql
CREATE TABLE activity (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES user(id),
    type activity_type NOT NULL,

    -- Explicit columns instead of JSONB
    market_id UUID REFERENCES market(id),
    market_title TEXT,
    amount NUMERIC(12,2),
    payout NUMERIC(12,2),
    vote TEXT CHECK (vote IN ('YES', 'NO')),
    result TEXT CHECK (result IN ('WON', 'LOST')),
    streak_count INTEGER,
    rank INTEGER,
    period leaderboard_period,
    followed_user_id UUID REFERENCES user(id),
    followed_username TEXT,

    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

## Trade-off Analysis

### JSONB (Current)
| Pros | Cons |
|------|------|
| Flexible - add fields without migration | No DB-level type safety |
| Less nullable columns | Can't index individual fields |
| Easy to evolve | No FK constraints on marketId, followedUserId |
| Single schema for all types | Frontend does unsafe `as` casts |

### Explicit Columns (Alternative)
| Pros | Cons |
|------|------|
| DB-level type safety | Many nullable columns |
| FK constraints possible | Schema migration for new fields |
| Can index specific columns | Wider table |
| Cleaner queries | More rigid structure |

### Recommendation

**Keep JSONB** because:

1. **Controlled write path** - All writes go through `ActivityService` methods (`logBetPlaced`, `logBetResult`, etc.) which enforce shape
2. **TypeScript types exist** - Schema is defined in `social.db.ts:194-206`
3. **Read-only in frontend** - Metadata is never mutated client-side
4. **No user input** - Metadata comes from trusted service layer, not user input
5. **Query patterns** - Always fetch full activity, never filter by metadata fields
6. **FK not needed** - We store `marketTitle` as denormalized string, don't need to join

**If you want stricter validation**, add Zod parsing in `getGlobalFeed`/`getFollowingFeed` return, not on write (since writes are already typed).

## Files Reference

| File | Purpose |
|------|---------|
| `packages/db/src/schema/social/social.db.ts` | DB schema definition |
| `packages/api/src/services/activity-service.ts` | Activity CRUD + typed log methods |
| `packages/api/src/services/bet-service.ts` | Calls `logBetPlaced` |
| `packages/api/src/services/settlement-service.ts` | Calls `logBetResult`, `logStreakMilestone` |
| `packages/api/src/routers/activity-router.ts` | oRPC endpoints |
| `apps/web/src/hooks/use-activity.ts` | React Query hooks |
| `apps/web/src/app/activity/activity-feed.tsx` | Feed UI component |
