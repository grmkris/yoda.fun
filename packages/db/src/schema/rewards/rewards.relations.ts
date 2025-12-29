import { relations } from "drizzle-orm";
import { user } from "../auth/auth.db";
import { transaction } from "../market/transaction.db";
import { dailyState } from "./daily-state.db";
import { referral, rewardClaim, userRewardState } from "./rewards.db";

export const userRewardStateRelations = relations(
  userRewardState,
  ({ one }) => ({
    user: one(user, {
      fields: [userRewardState.userId],
      references: [user.id],
    }),
  })
);

export const rewardClaimRelations = relations(rewardClaim, ({ one }) => ({
  user: one(user, {
    fields: [rewardClaim.userId],
    references: [user.id],
  }),
  transaction: one(transaction, {
    fields: [rewardClaim.transactionId],
    references: [transaction.id],
  }),
}));

export const referralRelations = relations(referral, ({ one }) => ({
  referrer: one(user, {
    fields: [referral.referrerId],
    references: [user.id],
    relationName: "referrals",
  }),
  referee: one(user, {
    fields: [referral.refereeId],
    references: [user.id],
    relationName: "referredBy",
  }),
}));

export const dailyStateRelations = relations(dailyState, ({ one }) => ({
  user: one(user, {
    fields: [dailyState.userId],
    references: [user.id],
  }),
}));
