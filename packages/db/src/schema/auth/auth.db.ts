import {
  type AccountId,
  type SessionId,
  typeIdGenerator,
  type UserId,
  type VerificationId,
} from "@yoda.fun/shared/typeid";
import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import {
  baseEntityFields,
  createTimestampField,
  typeId,
} from "../../utils/db-utils";

export const user = pgTable("user", {
  id: typeId("user", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("user"))
    .$type<UserId>(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  ...baseEntityFields,
  username: text("username").unique(),
  displayUsername: text("display_username"),
});

export const session = pgTable("session", {
  id: typeId("session", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("session"))
    .$type<SessionId>(),
  expiresAt: createTimestampField("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ...baseEntityFields,
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: typeId("user", "user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .$type<UserId>(),
});

export const account = pgTable("account", {
  id: typeId("account", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("account"))
    .$type<AccountId>(),
  accountId: typeId("account", "account_id").$type<AccountId>(),
  providerId: text("provider_id").notNull(),
  userId: typeId("user", "user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .$type<UserId>(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: createTimestampField("access_token_expires_at"),
  refreshTokenExpiresAt: createTimestampField("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  ...baseEntityFields,
});

export const verification = pgTable("verification", {
  id: typeId("verification", "id")
    .primaryKey()
    .$defaultFn(() => typeIdGenerator("verification"))
    .$type<VerificationId>(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: createTimestampField("expires_at").notNull(),
  createdAt: createTimestampField("created_at").$defaultFn(() => new Date()),
  updatedAt: createTimestampField("updated_at").$defaultFn(() => new Date()),
});
