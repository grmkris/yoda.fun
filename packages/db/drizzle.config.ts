import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load DATABASE_URL from apps/server/.env
dotenv.config({ path: "../../apps/server/.env" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export default defineConfig({
  schema: [
    "./src/schema/audit",
    "./src/schema/auth",
    "./src/schema/config",
    "./src/schema/erc8004",
    "./src/schema/market",
    "./src/schema/media",
    "./src/schema/rewards",
    "./src/schema/social",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
