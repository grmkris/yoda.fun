export const MarketStatus = {
  Active: 0,
  Resolved: 1,
  Cancelled: 2,
} as const;
export type MarketStatus = (typeof MarketStatus)[keyof typeof MarketStatus];

export const MarketResult = {
  Unresolved: 0,
  Yes: 1,
  No: 2,
  Invalid: 3,
} as const;
export type MarketResult = (typeof MarketResult)[keyof typeof MarketResult];

export interface MarketView {
  title: string;
  metadataUri: string;
  votingEndsAt: bigint;
  resolutionDeadline: bigint;
  status: MarketStatus;
  result: MarketResult;
  betCount: number;
  decryptedYesTotal: bigint;
  decryptedNoTotal: bigint;
  totalsDecrypted: boolean;
}
