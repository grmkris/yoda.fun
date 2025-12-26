import type { GeneratedMarket } from "../schemas";
import { calculateMarketDates } from "./duration-utils";

export interface PreparedMarket {
  title: string;
  description: string;
  category: string;
  resolutionCriteria: string;
  betAmount: string;
  votingEndsAt: Date;
  resolutionDeadline: Date;
  imageUrl: string | null;
}

export function prepareMarket(
  market: GeneratedMarket,
  imageUrl?: string | null
): PreparedMarket {
  const { votingEndsAt, resolutionDeadline } = calculateMarketDates(market.duration);

  return {
    title: market.title,
    description: market.description,
    category: market.category,
    resolutionCriteria: market.resolutionCriteria,
    betAmount: market.betAmount,
    votingEndsAt,
    resolutionDeadline,
    imageUrl: imageUrl ?? null,
  };
}
