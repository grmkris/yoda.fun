import {
  type AgentFeedbackId,
  type AgentIdentityId,
  type MarketId,
  typeIdGenerator,
  type UserId,
} from "@yoda.fun/shared/typeid";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  unique,
} from "drizzle-orm/pg-core";
import {
  baseEntityFields,
  createTimestampField,
  typeId,
} from "../../utils/db-utils";
import { user } from "../auth/auth.db";
import { market } from "../market/market.db";

// Enums
export const feedbackTypeEnum = pgEnum("feedback_type", [
  "RESOLUTION",
  "QUALITY",
]);

export const feedbackStatusEnum = pgEnum("feedback_status", [
  "PENDING_AUTH",
  "SUBMITTED",
  "CONFIRMED",
  "FAILED",
]);

// Tables
export const agentIdentity = pgTable("agent_identity", {
  id: typeId("agentIdentity", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("agentIdentity"))
    .$type<AgentIdentityId>(),
  // ERC-8004 on-chain identity
  agentId: integer("agent_id").notNull().unique(),
  ownerAddress: text("owner_address").notNull(),
  tokenUri: text("token_uri"),
  chainId: integer("chain_id").notNull(),
  // Agent metadata
  name: text("name").notNull(),
  description: text("description"),
  // Cached reputation scores (refreshed periodically from chain)
  cachedResolutionScore: integer("cached_resolution_score"),
  cachedResolutionCount: integer("cached_resolution_count").default(0),
  cachedQualityScore: integer("cached_quality_score"),
  cachedQualityCount: integer("cached_quality_count").default(0),
  lastCacheUpdate: createTimestampField("last_cache_update"),
  ...baseEntityFields,
});

export const agentFeedback = pgTable(
  "agent_feedback",
  {
    id: typeId("agentFeedback", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("agentFeedback"))
      .$type<AgentFeedbackId>(),
    // References
    userId: typeId("user", "user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    marketId: typeId("market", "market_id")
      .notNull()
      .references(() => market.id, { onDelete: "cascade" })
      .$type<MarketId>(),
    agentId: integer("agent_id").notNull(),
    // Feedback details
    feedbackType: feedbackTypeEnum("feedback_type").notNull(),
    score: integer("score").notNull(), // 1-5 user scale (maps to 0-100 on-chain)
    // On-chain tracking
    txHash: text("tx_hash"),
    onChainIndex: integer("on_chain_index"),
    status: feedbackStatusEnum("feedback_status").default("PENDING_AUTH"),
    ...baseEntityFields,
  },
  (table) => [
    // Each user can only give one feedback per market per type
    unique("unique_user_market_feedback_type").on(
      table.userId,
      table.marketId,
      table.feedbackType
    ),
    index("agent_feedback_user_id_idx").on(table.userId),
    index("agent_feedback_market_id_idx").on(table.marketId),
    index("agent_feedback_agent_id_idx").on(table.agentId),
    index("agent_feedback_status_idx").on(table.status),
  ]
);
