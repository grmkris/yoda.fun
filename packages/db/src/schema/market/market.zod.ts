import { MarketId } from "@yoda.fun/shared/typeid";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { bet, market } from "./market.db";

// Market schemas
export const selectMarketSchema = createSelectSchema(market, {
  id: MarketId,
});
export const insertMarketSchema = createSelectSchema(market).omit({
  id: true,
  result: true,
  resolvedAt: true,
  decryptedYesTotal: true,
  decryptedNoTotal: true,
  createdAt: true,
  updatedAt: true,
});

export type SelectMarket = z.infer<typeof selectMarketSchema>;
export type InsertMarket = z.infer<typeof insertMarketSchema>;

// Bet schemas
export const selectBetSchema = createSelectSchema(bet);
export const insertBetSchema = createSelectSchema(bet).omit({
  id: true,
  status: true,
  claimed: true,
  createdAt: true,
  updatedAt: true,
});

export type SelectBet = z.infer<typeof selectBetSchema>;
export type InsertBet = z.infer<typeof insertBetSchema>;
