import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { baseEntityFields } from "../../utils/db-utils";

export const networkEnum = pgEnum("network", ["BASE_MAINNET", "BASE_SEPOLIA"]);

export const systemConfig = pgTable("system_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  network: networkEnum("network").notNull().default("BASE_SEPOLIA"),
  description: text("description"),
  ...baseEntityFields,
});
