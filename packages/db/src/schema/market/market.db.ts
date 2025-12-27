import type { ResolutionStrategy } from "@yoda.fun/shared/resolution-types";
import {
  type BetId,
  type MarketId,
  type MediaId,
  type SettlementBatchId,
  typeIdGenerator,
  type UserBalanceId,
  type UserId,
} from "@yoda.fun/shared/typeid";
import {
  integer,
  jsonb,
  numeric,
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

// Enums
export const marketStatusEnum = pgEnum("market_status", [
  "PROCESSING",
  "LIVE",
  "VOTING_ENDED",
  "SETTLED",
  "CANCELLED",
]);

export const marketResultEnum = pgEnum("market_result", [
  "YES",
  "NO",
  "INVALID",
]);

export const betVoteEnum = pgEnum("bet_vote", ["YES", "NO"]);

export const betStatusEnum = pgEnum("bet_status", [
  "ACTIVE",
  "WON",
  "LOST",
  "REFUNDED",
]);

export const settlementStatusEnum = pgEnum("settlement_status", [
  "PENDING",
  "SETTLED",
  "FAILED",
]);

export const resolutionTypeEnum = pgEnum("resolution_type", [
  "PRICE",
  "SPORTS",
  "WEB_SEARCH",
]);

// Tables
export const market = pgTable("market", {
  id: typeId("market", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("market"))
    .$type<MarketId>(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  mediaId: typeId("media", "media_id").$type<MediaId>(),
  category: text("category"),
  tags: text("tags").array(),
  status: marketStatusEnum("status").notNull().default("PROCESSING"),
  votingEndsAt: createTimestampField("voting_ends_at").notNull(),
  resolutionDeadline: createTimestampField("resolution_deadline").notNull(),
  betAmount: numeric("bet_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0.10"),
  totalYesVotes: integer("total_yes_votes").notNull().default(0),
  totalNoVotes: integer("total_no_votes").notNull().default(0),
  totalPool: numeric("total_pool", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  result: marketResultEnum("result"),
  createdById: typeId("user", "created_by_id")
    .references(() => user.id, { onDelete: "set null" })
    .$type<UserId>(),
  resolvedAt: createTimestampField("resolved_at"),
  resolutionCriteria: text("resolution_criteria"),
  resolutionType: resolutionTypeEnum("resolution_type"),
  resolutionStrategy: jsonb("resolution_strategy").$type<ResolutionStrategy>(),
  resolutionSources:
    jsonb("resolution_sources").$type<
      Array<{ url: string; snippet: string }>
    >(),
  resolutionConfidence: integer("resolution_confidence"),
  ...baseEntityFields,
});

export const bet = pgTable(
  "bet",
  {
    id: typeId("bet", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("bet"))
      .$type<BetId>(),
    userId: typeId("user", "user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    marketId: typeId("market", "market_id")
      .notNull()
      .references(() => market.id, { onDelete: "cascade" })
      .$type<MarketId>(),
    vote: betVoteEnum("vote").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    status: betStatusEnum("status").notNull().default("ACTIVE"),
    payout: numeric("payout", { precision: 10, scale: 2 }),
    // Settlement tracking
    settlementStatus: settlementStatusEnum("settlement_status")
      .notNull()
      .default("PENDING"),
    settledAt: createTimestampField("settled_at"),
    settlementTxHash: text("settlement_tx_hash"),
    settlementBatchId: typeId(
      "settlementBatch",
      "settlement_batch_id"
    ).$type<SettlementBatchId>(),
    ...baseEntityFields,
  },
  (table) => [
    // Each user can only bet once per market
    unique("unique_user_market_bet").on(table.userId, table.marketId),
  ]
);

export const userBalance = pgTable("user_balance", {
  id: typeId("userBalance", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("userBalance"))
    .$type<UserBalanceId>(),
  userId: typeId("user", "user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" })
    .$type<UserId>(),
  availableBalance: numeric("available_balance", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  pendingBalance: numeric("pending_balance", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  totalDeposited: numeric("total_deposited", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  totalWithdrawn: numeric("total_withdrawn", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  ...baseEntityFields,
});
