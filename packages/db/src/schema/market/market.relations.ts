import { relations } from "drizzle-orm";
import { user } from "../auth/auth.db";
import { bet, market } from "./market.db";

export const marketRelations = relations(market, ({ many }) => ({
  bets: many(bet),
}));

export const betRelations = relations(bet, ({ one }) => ({
  user: one(user, {
    fields: [bet.userId],
    references: [user.id],
  }),
  market: one(market, {
    fields: [bet.marketId],
    references: [market.id],
  }),
}));
