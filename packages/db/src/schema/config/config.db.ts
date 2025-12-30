import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { baseEntityFields } from "../../utils/db-utils";

export const networkEnum = pgEnum("network", ["BASE_MAINNET"]);

export const systemConfig = pgTable("system_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  network: networkEnum("network").notNull().default("BASE_MAINNET"),
  description: text("description"),
  ...baseEntityFields,
});
