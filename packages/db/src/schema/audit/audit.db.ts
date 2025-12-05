import {
  index,
  integer,
  jsonb,
  pgSchema,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod";

/** @see https://supabase.com/blog/postgres-audit */
export const auditSchema = pgSchema("audit");

export const AUDITED_TABLES = [
  "bet",
  "follow",
  "user_profile",
  "user_stats",
] as const;
export const AuditedTable = z.enum(AUDITED_TABLES);
export type AuditedTable = z.infer<typeof AuditedTable>;

export const OPERATIONS = ["INSERT", "UPDATE", "DELETE", "TRUNCATE"] as const;
export const Operation = z.enum(OPERATIONS);
export type Operation = z.infer<typeof Operation>;

export const recordVersion = auditSchema.table(
  "record_version",
  {
    id: serial("id").primaryKey(),
    recordId: text("record_id"),
    oldRecordId: text("old_record_id"),
    op: text("op", { enum: OPERATIONS }),
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
    tableOid: integer("table_oid").notNull(),
    tableSchema: text("table_schema").notNull(),
    tableName: text("table_name", { enum: AUDITED_TABLES }).notNull(),
    record: jsonb("record"),
    oldRecord: jsonb("old_record"),
  },
  (t) => [
    index("record_version_ts").using("brin", t.ts),
    index("record_version_table_oid").using("btree", t.tableOid),
    index("record_version_record_id").using("btree", t.recordId),
    index("record_version_old_record_id").using("btree", t.oldRecordId),
  ]
);

export type RecordVersion = typeof recordVersion.$inferSelect;
export type NewRecordVersion = typeof recordVersion.$inferInsert;
