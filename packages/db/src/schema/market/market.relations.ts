import { relations } from "drizzle-orm";
import { user } from "../auth/auth.db";
import { bet, market, userBalance } from "./market.db";
import { deposit, transaction, withdrawal } from "./transaction.db";

export const marketRelations = relations(market, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [market.createdById],
    references: [user.id],
  }),
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

export const userBalanceRelations = relations(userBalance, ({ one }) => ({
  user: one(user, {
    fields: [userBalance.userId],
    references: [user.id],
  }),
}));

export const transactionRelations = relations(transaction, ({ one }) => ({
  user: one(user, {
    fields: [transaction.userId],
    references: [user.id],
  }),
}));

export const depositRelations = relations(deposit, ({ one }) => ({
  user: one(user, {
    fields: [deposit.userId],
    references: [user.id],
  }),
  transaction: one(transaction, {
    fields: [deposit.transactionId],
    references: [transaction.id],
  }),
}));

export const withdrawalRelations = relations(withdrawal, ({ one }) => ({
  user: one(user, {
    fields: [withdrawal.userId],
    references: [user.id],
  }),
  transaction: one(transaction, {
    fields: [withdrawal.transactionId],
    references: [transaction.id],
  }),
}));
