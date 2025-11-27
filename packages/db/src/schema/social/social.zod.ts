import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { activity, follow, userProfile, userStats } from "./social.db";

// UserStats schemas
export const insertUserStatsSchema = createInsertSchema(userStats);
export const selectUserStatsSchema = createSelectSchema(userStats);

// UserProfile schemas
export const insertUserProfileSchema = createInsertSchema(userProfile);
export const selectUserProfileSchema = createSelectSchema(userProfile);

// Follow schemas
export const insertFollowSchema = createInsertSchema(follow);
export const selectFollowSchema = createSelectSchema(follow);

// Activity schemas
export const insertActivitySchema = createInsertSchema(activity);
export const selectActivitySchema = createSelectSchema(activity);
