import { relations } from "drizzle-orm";
import { account, session, user } from "./auth.db";

// User relations
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session, { relationName: "userSessions" }),
  accounts: many(account, { relationName: "userAccounts" }),
}));

// Session relations
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
    relationName: "userSessions",
  }),
}));

// Account relations
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
    relationName: "userAccounts",
  }),
}));
