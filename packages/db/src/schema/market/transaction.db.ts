import {
  type DepositId,
  type TransactionId,
  typeIdGenerator,
  type UserId,
  type WithdrawalId,
} from "@yoda.fun/shared/typeid";
import { jsonb, numeric, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import {
  baseEntityFields,
  createTimestampField,
  typeId,
} from "../../utils/db-utils";
import { user } from "../auth/auth.db";

// Enums
export const transactionTypeEnum = pgEnum("transaction_type", [
  "DEPOSIT",
  "WITHDRAWAL",
  "BET_PLACED",
  "PAYOUT",
  "REFUND",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "PENDING",
  "COMPLETED",
  "FAILED",
]);

export const depositStatusEnum = pgEnum("deposit_status", [
  "PENDING",
  "CONFIRMED",
  "FAILED",
]);

export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

// Tables
export const transaction = pgTable("transaction", {
  id: typeId("transaction", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("transaction"))
    .$type<TransactionId>(),
  userId: typeId("user", "user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .$type<UserId>(),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").notNull().default("PENDING"),
  txHash: text("tx_hash"),
  metadata: jsonb("metadata").$type<{
    marketId?: string;
    betId?: string;
    depositId?: string;
    withdrawalId?: string;
    walletAddress?: string;
    notes?: string;
    [key: string]: unknown;
  }>(),
  ...baseEntityFields,
});

export const deposit = pgTable("deposit", {
  id: typeId("deposit", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("deposit"))
    .$type<DepositId>(),
  userId: typeId("user", "user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .$type<UserId>(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: depositStatusEnum("status").notNull().default("PENDING"),
  txHash: text("tx_hash").notNull(),
  walletAddress: text("wallet_address").notNull(),
  transactionId: typeId("transaction", "transaction_id")
    .references(() => transaction.id, { onDelete: "set null" })
    .$type<TransactionId>(),
  confirmedAt: createTimestampField("confirmed_at"),
  ...baseEntityFields,
});

export const withdrawal = pgTable("withdrawal", {
  id: typeId("withdrawal", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("withdrawal"))
    .$type<WithdrawalId>(),
  userId: typeId("user", "user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .$type<UserId>(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: withdrawalStatusEnum("status").notNull().default("PENDING"),
  walletAddress: text("wallet_address").notNull(),
  txHash: text("tx_hash"),
  transactionId: typeId("transaction", "transaction_id")
    .references(() => transaction.id, { onDelete: "set null" })
    .$type<TransactionId>(),
  completedAt: createTimestampField("completed_at"),
  ...baseEntityFields,
});
