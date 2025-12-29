import {
  type DailyStateId,
  typeIdGenerator,
  type UserId,
} from "@yoda.fun/shared/typeid";
import { boolean, date, integer, pgTable, unique } from "drizzle-orm/pg-core";
import { baseEntityFields, typeId } from "../../utils/db-utils";
import { user } from "../auth/auth.db";

/**
 * Tracks daily user state for the points economy:
 * - Free skips used (3 free per day, then 1 point each)
 * - Daily points claim status (5 points per day, tap to claim)
 *
 * Resets at midnight UTC each day.
 */
export const dailyState = pgTable(
  "daily_state",
  {
    id: typeId("dailyState", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("dailyState"))
      .$type<DailyStateId>(),
    userId: typeId("user", "user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    // Date in YYYY-MM-DD format (UTC)
    date: date("date", { mode: "string" }).notNull(),
    // Skip tracking: 3 free per day
    freeSkipsUsed: integer("free_skips_used").notNull().default(0),
    // Daily claim: 5 points, tap to claim
    dailyPointsClaimed: boolean("daily_points_claimed")
      .notNull()
      .default(false),
    ...baseEntityFields,
  },
  (table) => [
    // Each user can only have one daily_state per date
    unique("unique_user_date_state").on(table.userId, table.date),
  ]
);
