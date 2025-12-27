import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { referral, rewardClaim, userRewardState } from "./rewards.db";

// UserRewardState schemas
export const insertUserRewardStateSchema = createInsertSchema(userRewardState);
export const selectUserRewardStateSchema = createSelectSchema(userRewardState);

// RewardClaim schemas
export const insertRewardClaimSchema = createInsertSchema(rewardClaim);
export const selectRewardClaimSchema = createSelectSchema(rewardClaim);

// Referral schemas
export const insertReferralSchema = createInsertSchema(referral);
export const selectReferralSchema = createSelectSchema(referral);
