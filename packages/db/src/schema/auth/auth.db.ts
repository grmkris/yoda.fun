import {
  type AccountId,
  type SessionId,
  typeIdGenerator,
  type UserId,
  type VerificationId,
  type WalletAddressId,
} from "@yoda.fun/shared/typeid";
import { boolean, index, pgTable, text } from "drizzle-orm/pg-core";
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
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  displayUsername: text("display_username"),
});

export const session = pgTable(
  "session",
  {
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
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: typeId("account", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("account"))
      .$type<AccountId>(),
    accountId: typeId("account", "account_id").notNull().$type<AccountId>(),
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
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: typeId("verification", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("verification"))
      .$type<VerificationId>(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: createTimestampField("expires_at").notNull(),
    createdAt: createTimestampField("created_at").$defaultFn(() => new Date()),
    updatedAt: createTimestampField("updated_at").$defaultFn(() => new Date()),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const walletAddress = pgTable(
  "wallet_address",
  {
    id: typeId("walletAddress", "id")
      .primaryKey()
      .$defaultFn(() => typeIdGenerator("walletAddress"))
      .$type<WalletAddressId>(),
    userId: typeId("user", "user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .$type<UserId>(),
    address: text("address").notNull(),
    chainNamespace: text("chain_namespace").notNull(), // "eip155" | "solana" | "bip122" // TODO make these enums
    chainId: text("chain_id").notNull(), // "1", "8453", "mainnet" // TODO make these enums
    isPrimary: boolean("is_primary")
      .$defaultFn(() => false)
      .notNull(),
    ...baseEntityFields,
    // SIWX session data for client-side re-verification
    siwxMessage: text("siwx_message"),
    siwxSignature: text("siwx_signature"),
  },
  (table) => [
    index("walletAddress_userId_idx").on(table.userId),
    index("walletAddress_address_idx").on(table.address),
  ]
);
