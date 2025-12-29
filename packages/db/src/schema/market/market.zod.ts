import { MarketId } from "@yoda.fun/shared/typeid";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { bet, market, userBalance } from "./market.db";
import {
  deposit,
  transaction as transactionTable,
  withdrawal,
} from "./transaction.db";

// Market schemas
export const selectMarketSchema = createSelectSchema(market, {
  id: MarketId,
});
export const insertMarketSchema = createSelectSchema(market).omit({
  id: true,
  totalYesVotes: true,
  totalNoVotes: true,
  totalPool: true,
  result: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type SelectMarket = z.infer<typeof selectMarketSchema>;
export type InsertMarket = z.infer<typeof insertMarketSchema>;

// Bet schemas
export const selectBetSchema = createSelectSchema(bet);
export const insertBetSchema = createSelectSchema(bet).omit({
  id: true,
  status: true,
  pointsReturned: true,
  settlementStatus: true,
  settledAt: true,
  settlementBatchId: true,
  createdAt: true,
  updatedAt: true,
});

export type SelectBet = z.infer<typeof selectBetSchema>;
export type InsertBet = z.infer<typeof insertBetSchema>;

// User balance schemas
export const selectUserBalanceSchema = createSelectSchema(userBalance);
export const insertUserBalanceSchema = createSelectSchema(userBalance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SelectUserBalance = z.infer<typeof selectUserBalanceSchema>;
export type InsertUserBalance = z.infer<typeof insertUserBalanceSchema>;

// Transaction schemas
export const selectTransactionSchema = createSelectSchema(transactionTable);
export const insertTransactionSchema = createSelectSchema(
  transactionTable
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SelectTransaction = z.infer<typeof selectTransactionSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// Deposit schemas
export const selectDepositSchema = createSelectSchema(deposit);
export const insertDepositSchema = createSelectSchema(deposit).omit({
  id: true,
  confirmedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type SelectDeposit = z.infer<typeof selectDepositSchema>;
export type InsertDeposit = z.infer<typeof insertDepositSchema>;

// Withdrawal schemas
export const selectWithdrawalSchema = createSelectSchema(withdrawal);
export const insertWithdrawalSchema = createSelectSchema(withdrawal).omit({
  id: true,
  txHash: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type SelectWithdrawal = z.infer<typeof selectWithdrawalSchema>;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
