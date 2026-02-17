import {
  type BetId,
  type MarketId,
  typeIdGenerator,
  type UserId,
} from "@yoda.fun/shared/typeid";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
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

export const betStatusEnum = pgEnum("bet_status", [
  "ACTIVE",
  "WON",
  "LOST",
  "REFUNDED",
]);

// Tables
export const market = pgTable("market", {
  id: typeId("market", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("market"))
    .$type<MarketId>(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  category: text("category"),
  tags: text("tags").array(),
  status: marketStatusEnum("status").notNull().default("PROCESSING"),
  result: marketResultEnum("result"),
  votingEndsAt: createTimestampField("voting_ends_at").notNull(),
  resolutionDeadline: createTimestampField("resolution_deadline").notNull(),
  resolvedAt: createTimestampField("resolved_at"),
  resolutionCriteria: text("resolution_criteria"),
  // On-chain (FHEVM) — required for all markets
  onChainMarketId: integer("on_chain_market_id").notNull(),
  onChainTxHash: text("on_chain_tx_hash").notNull(),
  metadataUri: text("metadata_uri"),
  // Decrypted totals (from TotalsDecrypted event)
  decryptedYesTotal: integer("decrypted_yes_total"),
  decryptedNoTotal: integer("decrypted_no_total"),
  ...baseEntityFields,
});

export const bet = pgTable(
  "bet",
  {
    id: typeId("bet", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("bet"))
      .$type<BetId>(),
    userAddress: text("user_address").notNull(),
    userId: typeId("user", "user_id")
      .references(() => user.id, { onDelete: "set null" })
      .$type<UserId>(),
    marketId: typeId("market", "market_id")
      .notNull()
      .references(() => market.id, { onDelete: "cascade" })
      .$type<MarketId>(),
    onChainTxHash: text("on_chain_tx_hash").notNull(),
    claimed: boolean("claimed").notNull().default(false),
    status: betStatusEnum("status").notNull().default("ACTIVE"),
    ...baseEntityFields,
  },
  (table) => [
    unique("unique_user_market_bet").on(table.userAddress, table.marketId),
  ]
);

// Indexer state — tracks last indexed block for event sync
export const indexerState = pgTable("indexer_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
