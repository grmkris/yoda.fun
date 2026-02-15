export enum MarketStatus {
  Active = 0,
  Resolved = 1,
  Cancelled = 2,
}

export enum MarketResult {
  Unresolved = 0,
  Yes = 1,
  No = 2,
  Invalid = 3,
}

export interface MarketView {
  title: string;
  votingEndsAt: bigint;
  resolutionDeadline: bigint;
  status: MarketStatus;
  result: MarketResult;
  betCount: number;
  decryptedYesTotal: bigint;
  decryptedNoTotal: bigint;
  totalsDecrypted: boolean;
}
