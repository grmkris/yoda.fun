import { NUMERIC_CONSTANTS } from "@yoda.fun/shared/constants";
import {
  AccountId,
  SessionId,
  UserId,
  VerificationId,
} from "@yoda.fun/shared/typeid";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { account, session, user, verification } from "./auth.db";

// User Schemas
export const SelectUserSchema = createSelectSchema(user, {
  id: UserId,
});
export const InsertUserSchema = z.object({
  name: z.string().min(NUMERIC_CONSTANTS.validationLimits.minStringLength),
  email: z.string().email(),
  emailVerified: z.boolean(),
  image: z.string().optional(),
  username: z.string().optional(),
  displayUsername: z.string().optional(),
});
export type SelectUserSchema = z.infer<typeof SelectUserSchema>;
export type InsertUserSchema = z.infer<typeof InsertUserSchema>;

// Session Schemas
export const SelectSessionSchema = createSelectSchema(session, {
  id: SessionId,
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: UserId,
});
export const InsertSessionSchema = z.object({
  expiresAt: z.coerce.date(),
  token: z.string().min(NUMERIC_CONSTANTS.validationLimits.minStringLength),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  userId: UserId,
});
export type SelectSessionSchema = z.infer<typeof SelectSessionSchema>;
export type InsertSessionSchema = z.infer<typeof InsertSessionSchema>;

// Account Schemas
export const SelectAccountSchema = createSelectSchema(account, {
  id: AccountId,
  userId: UserId,
  accessTokenExpiresAt: z.coerce.date().nullable(),
  refreshTokenExpiresAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export const InsertAccountSchema = z.object({
  accountId: z.string().min(NUMERIC_CONSTANTS.validationLimits.minStringLength),
  providerId: z
    .string()
    .min(NUMERIC_CONSTANTS.validationLimits.minStringLength),
  userId: UserId,
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  idToken: z.string().optional(),
  accessTokenExpiresAt: z.coerce.date().optional().nullable(),
  refreshTokenExpiresAt: z.coerce.date().optional().nullable(),
  scope: z.string().optional(),
  password: z.string().optional(),
});
export type SelectAccountSchema = z.infer<typeof SelectAccountSchema>;
export type InsertAccountSchema = z.infer<typeof InsertAccountSchema>;

// Verification Schemas
export const SelectVerificationSchema = createSelectSchema(verification, {
  id: VerificationId,
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
});
export const InsertVerificationSchema = z.object({
  identifier: z
    .string()
    .min(NUMERIC_CONSTANTS.validationLimits.minStringLength),
  value: z.string().min(NUMERIC_CONSTANTS.validationLimits.minStringLength),
  expiresAt: z.coerce.date(),
});
export type SelectVerificationSchema = z.infer<typeof SelectVerificationSchema>;
export type InsertVerificationSchema = z.infer<typeof InsertVerificationSchema>;
