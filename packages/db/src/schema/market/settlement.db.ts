import {
  type SettlementBatchId,
  typeIdGenerator,
} from "@yoda.fun/shared/typeid";
import { integer, numeric, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import {
  baseEntityFields,
  createTimestampField,
  typeId,
} from "../../utils/db-utils";

export const settlementBatchStatusEnum = pgEnum("settlement_batch_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

export const settlementBatch = pgTable("settlement_batch", {
  id: typeId("settlementBatch", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("settlementBatch"))
    .$type<SettlementBatchId>(),
  status: settlementBatchStatusEnum("status").notNull().default("PENDING"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  userCount: integer("user_count").notNull(),
  txHash: text("tx_hash"),
  processedAt: createTimestampField("processed_at"),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").notNull().default(0),
  ...baseEntityFields,
});
