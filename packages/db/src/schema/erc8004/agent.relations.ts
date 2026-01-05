import { relations } from "drizzle-orm";
import { user } from "../auth/auth.db";
import { market } from "../market/market.db";
import { agentFeedback } from "./agent.db";

export const agentFeedbackRelations = relations(agentFeedback, ({ one }) => ({
  user: one(user, {
    fields: [agentFeedback.userId],
    references: [user.id],
  }),
  market: one(market, {
    fields: [agentFeedback.marketId],
    references: [market.id],
  }),
}));
